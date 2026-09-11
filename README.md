# Week 06 Assignment — Mini House-Price Prediction API

## How to run

From the `Week-06-Assignment/backend/` directory:

```powershell
python -m venv .venv
\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn main:app --reload
```

Then open the frontend at:

`http://127.0.0.1:8000/static/house_form.html`

The interactive API documentation is available at `http://127.0.0.1:8000/docs`.

## Verification

The request `GET /predict?area=80&bedrooms=3&location=hanoi` returns:

```json
{
  "area": 80.0,
  "bedrooms": 3,
  "location": "hanoi",
  "predicted_price": 2405000000.0
}
```

`location` is optional and defaults to `other`, so omitting it still produces a valid prediction. `area` is required because it has no default value and is type-annotated as `float`; FastAPI therefore returns HTTP 422 when it is missing (or invalid). The same validation applies to the required `bedrooms` parameter.

The frontend uses a relative `/predict` URL because FastAPI serves both the page and the API from `127.0.0.1:8000`; the browser therefore sends the request to the same origin without a cross-origin (CORS) request.

The form displays the returned price with Vietnamese thousands separators and shows an error message if the request fails. Each submission creates a new `GET /predict` entry in the Uvicorn terminal.

## Bonus

`POST /predict` is also available. It accepts JSON such as:

```json
{"area": 80, "bedrooms": 3, "location": "hanoi"}
```

Query parameters are encoded in the URL, while a JSON body is sent as the request content. The POST endpoint validates that body with the `HouseInput` Pydantic model.
