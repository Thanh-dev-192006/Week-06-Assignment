from fastapi import FastAPI

app = FastAPI()


@app.get("/")
async def read_root():
    return {"Hello": "World"}


@app.get("/hello/{name}")
def hello(name: str):
    return {"greeting": f"Hello {name}"}


@app.get("/add")
def add(a: int, b: int):
    return {"result": a + b}