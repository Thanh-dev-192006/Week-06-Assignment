from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles

app = FastAPI()
app.mount("/static", StaticFiles(directory="../frontend"), name="static")

@app.get("/")
def read_root():
    return {"message": "House price prediction API is running"}


def predict_price(area: float, bedrooms: int, location: str) -> float:
    price = 500_000_000 + 15_000_000 * area + 50_000_000 * bedrooms

    location = location.lower()
    if location == "hanoi":
        price *= 1.3
    elif location == "hcmc":
        price *= 1.25

    return float(round(price / 1_000_000) * 1_000_000)


@app.get("/predict")
def predict(area: float, bedrooms: int, location: str):
    price = predict_price(area, bedrooms, location)
    return {"predicted_price": price}
