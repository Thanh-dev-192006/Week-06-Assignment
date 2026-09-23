from itertools import count
from pathlib import Path

from fastapi import FastAPI, HTTPException, Query
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

FRONTEND_PATH = Path(__file__).resolve().parent.parent / "frontend"

# Rates used by the toy house-price formula (VND).
PRICE_PER_SQM = 15_000_000
PRICE_PER_KM = 5_000_000
PRICE_PER_BEDROOM = 20_000_000

app = FastAPI()


# ---------- Schemas ----------
class ItemBase(BaseModel):
    name: str
    price: float
    in_stock: bool = True


class ItemCreate(ItemBase):
    pass


class ItemUpdate(BaseModel):
    name: str | None = None
    price: float | None = None
    in_stock: bool | None = None


class ItemPublic(ItemBase):
    id: int


class ItemListResponse(BaseModel):
    items: list[ItemPublic]
    total: int
    skip: int
    limit: int


class HousePriceRequest(BaseModel):
    area_sqm: float = Field(gt=0)
    bedrooms: int = Field(ge=0)
    distance_to_center_km: float


class HousePricePrediction(BaseModel):
    predicted_price: float
    currency: str = "VND"


# ---------- In-memory store ----------
store: dict[int, ItemPublic] = {}
id_counter = count(1)


def get_or_404(item_id: int) -> ItemPublic:
    item = store.get(item_id)
    if item is None:
        raise HTTPException(status_code=404, detail="Item not found")
    return item


def assert_name_available(name: str, ignore_id: int | None = None) -> None:
    wanted = name.casefold()
    taken = any(
        other.id != ignore_id and other.name.casefold() == wanted
        for other in store.values()
    )
    if taken:
        raise HTTPException(
            status_code=409, detail="Item with this name already exists"
        )


def filter_items(
    candidates: list[ItemPublic],
    min_price: float | None,
    max_price: float | None,
    q: str | None,
) -> list[ItemPublic]:
    needle = q.casefold() if q else None
    return [
        item
        for item in candidates
        if (min_price is None or item.price >= min_price)
        and (max_price is None or item.price <= max_price)
        and (needle is None or needle in item.name.casefold())
    ]


# ---------- Routes ----------
@app.get("/")
def read_root():
    return {"message": "Item API is running"}


@app.get("/items", response_model=ItemListResponse)
def list_items(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1),
    min_price: float | None = Query(None, ge=0),
    max_price: float | None = Query(None, ge=0),
    q: str | None = Query(None, min_length=2),
    sort_by: str = Query("id", pattern="^(id|name|price)$"),
    order: str = Query("asc", pattern="^(asc|desc)$"),
):
    matches = filter_items(list(store.values()), min_price, max_price, q)
    matches.sort(key=lambda item: getattr(item, sort_by), reverse=(order == "desc"))

    return ItemListResponse(
        items=matches[skip : skip + limit],
        total=len(matches),
        skip=skip,
        limit=limit,
    )


@app.get("/items/{item_id}", response_model=ItemPublic)
def get_item(item_id: int):
    return get_or_404(item_id)


@app.post("/items", response_model=ItemPublic, status_code=201)
def create_item(payload: ItemCreate):
    assert_name_available(payload.name)
    item = ItemPublic(id=next(id_counter), **payload.model_dump())
    store[item.id] = item
    return item


@app.put("/items/{item_id}", response_model=ItemPublic)
def replace_item(item_id: int, payload: ItemCreate):
    get_or_404(item_id)
    assert_name_available(payload.name, ignore_id=item_id)
    store[item_id] = ItemPublic(id=item_id, **payload.model_dump())
    return store[item_id]


@app.patch("/items/{item_id}", response_model=ItemPublic)
def patch_item(item_id: int, payload: ItemUpdate):
    current = get_or_404(item_id)
    changes = payload.model_dump(exclude_unset=True)

    if changes.get("name") is not None:
        assert_name_available(changes["name"], ignore_id=item_id)

    store[item_id] = current.model_copy(update=changes)
    return store[item_id]


@app.delete("/items/{item_id}")
def delete_item(item_id: int):
    get_or_404(item_id)
    del store[item_id]
    return {"message": "Item deleted"}


@app.post("/predict/house-price", response_model=HousePricePrediction)
def predict_house_price(payload: HousePriceRequest):
    estimate = (
        payload.area_sqm * PRICE_PER_SQM
        - payload.distance_to_center_km * PRICE_PER_KM
        + payload.bedrooms * PRICE_PER_BEDROOM
    )
    return HousePricePrediction(predicted_price=estimate)


app.mount("/static", StaticFiles(directory=FRONTEND_PATH), name="static")
