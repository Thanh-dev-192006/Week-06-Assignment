from pathlib import Path

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

app = FastAPI()


def predict_price(area: float, bedrooms: int, location: str) -> float:
    price = 500_000_000 + 15_000_000 * area + 50_000_000 * bedrooms

    location = location.lower()
    if location == "hanoi":
        price *= 1.3
    elif location == "hcmc":
        price *= 1.25

    return float(round(price / 1_000_000) * 1_000_000)


@app.get("/")
def read_root():
    return {"message": "House price prediction API is running"}


# This endpoint is synchronous because the prediction is a local calculation with no awaited I/O.
@app.get("/predict")
def predict(area: float, bedrooms: int, location: str = "other"):
    price = predict_price(area, bedrooms, location)
    return {
        "area": area,
        "bedrooms": bedrooms,
        "location": location,
        "predicted_price": price,
    }


class HouseInput(BaseModel):
    area: float
    bedrooms: int
    location: str = "other"


@app.post("/predict")
def predict_from_json(house: HouseInput):
    price = predict_price(house.area, house.bedrooms, house.location)
    return {
        "area": house.area,
        "bedrooms": house.bedrooms,
        "location": house.location,
        "predicted_price": price,
    }


# Resolve this from the file location so the mount works regardless of the current working directory.
frontend_directory = Path(__file__).resolve().parent.parent / "frontend"
app.mount("/static", StaticFiles(directory=frontend_directory), name="static")
