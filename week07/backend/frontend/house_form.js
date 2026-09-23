const $ = (selector) => document.querySelector(selector);

const dom = {
  itemForm: $('#itemForm'),
  itemId: $('#itemId'),
  itemName: $('#itemName'),
  itemPrice: $('#itemPrice'),
  itemInStock: $('#itemInStock'),
  itemSubmit: $('#itemSubmit'),
  itemCancel: $('#itemCancel'),
  notice: $('#notice'),
  filterForm: $('#filterForm'),
  filterClear: $('#filterClear'),
  itemList: $('#itemList'),
  pageSummary: $('#pageSummary'),
  pagePrev: $('#pagePrev'),
  pageNext: $('#pageNext'),
  predictForm: $('#predictForm'),
  predictSubmit: $('#predictSubmit'),
  predictResult: $('#predictResult'),
};

const DEFAULT_PAGE_SIZE = 10;
const state = { skip: 0, limit: DEFAULT_PAGE_SIZE, total: 0 };

const priceFormat = new Intl.NumberFormat('vi-VN');

// ---------- API helper ----------
function describeError(body, status) {
  const detail = body?.detail;
  if (typeof detail === 'string') return detail;
  if (detail) return JSON.stringify(detail);
  return `Request failed (${status})`;
}

async function callApi(path, { method = 'GET', json } = {}) {
  const init = { method };
  if (json !== undefined) {
    init.headers = { 'Content-Type': 'application/json' };
    init.body = JSON.stringify(json);
  }

  const response = await fetch(path, init);
  const body = await response.json().catch(() => null);
  if (!response.ok) throw new Error(describeError(body, response.status));
  return body;
}

// ---------- UI helpers ----------
function setText(element, text, isError = false) {
  element.textContent = text;
  element.dataset.error = String(isError);
}

const notify = (text, isError = false) => setText(dom.notice, text, isError);

function stockLabel(item) {
  return item.in_stock ? 'In stock' : 'Out of stock';
}

function makeButton(label, onClick, className = '') {
  const button = document.createElement('button');
  button.type = 'button';
  button.textContent = label;
  if (className) button.className = className;
  button.addEventListener('click', onClick);
  return button;
}

function resetItemForm() {
  dom.itemForm.reset();
  dom.itemId.value = '';
  dom.itemSubmit.textContent = 'Create item';
  dom.itemCancel.hidden = true;
}

function startEditing(item) {
  dom.itemId.value = item.id;
  dom.itemName.value = item.name;
  dom.itemPrice.value = item.price;
  dom.itemInStock.checked = item.in_stock;
  dom.itemSubmit.textContent = 'Save changes (PATCH)';
  dom.itemCancel.hidden = false;
  dom.itemName.focus();
}

// ---------- Item list ----------
function buildRow(item) {
  const row = document.createElement('li');

  const summary = document.createElement('span');
  summary.textContent = `#${item.id} ${item.name} — ${item.price} — ${stockLabel(item)}`;

  const actions = document.createElement('div');
  actions.className = 'item-actions';
  actions.append(
    makeButton('View', () => showItem(item.id), 'secondary'),
    makeButton('Edit', () => startEditing(item), 'secondary'),
    makeButton('Delete', () => removeItem(item.id), 'danger'),
  );

  row.append(summary, actions);
  return row;
}

function renderList(items) {
  if (items.length === 0) {
    const empty = document.createElement('li');
    empty.textContent = 'No matching items.';
    dom.itemList.replaceChildren(empty);
    return;
  }
  dom.itemList.replaceChildren(...items.map(buildRow));
}

function buildQuery() {
  const form = dom.filterForm.elements;
  const params = new URLSearchParams({
    skip: state.skip,
    limit: state.limit,
    sort_by: form.sort_by.value,
    order: form.order.value,
  });

  for (const field of ['min_price', 'max_price', 'q']) {
    const value = form[field].value.trim();
    if (value) params.set(field, value);
  }
  return params;
}

async function refreshList() {
  try {
    const page = await callApi(`/items?${buildQuery()}`);
    state.total = page.total;
    renderList(page.items);
    dom.pageSummary.textContent = `Showing ${page.items.length} of ${page.total} matching item(s).`;
    dom.pagePrev.disabled = state.skip === 0;
    dom.pageNext.disabled = state.skip + state.limit >= state.total;
  } catch (error) {
    notify(error.message, true);
  }
}

async function showItem(id) {
  try {
    const item = await callApi(`/items/${id}`);
    notify(`Item #${item.id}: ${item.name}, price ${item.price}, ${stockLabel(item).toLowerCase()}`);
  } catch (error) {
    notify(error.message, true);
  }
}

async function removeItem(id) {
  try {
    const { message } = await callApi(`/items/${id}`, { method: 'DELETE' });
    notify(message);
    if (dom.itemId.value === String(id)) resetItemForm();

    // If the deleted item was the last one on this page, step back a page.
    if (state.skip > 0 && state.skip >= state.total - 1) {
      state.skip = Math.max(0, state.skip - state.limit);
    }
    await refreshList();
  } catch (error) {
    notify(error.message, true);
  }
}

// ---------- Events ----------
dom.itemForm.addEventListener('submit', async (event) => {
  event.preventDefault();

  const editingId = dom.itemId.value;
  const payload = {
    name: dom.itemName.value.trim(),
    price: Number(dom.itemPrice.value),
    in_stock: dom.itemInStock.checked,
  };

  dom.itemSubmit.disabled = true;
  try {
    const saved = await callApi(editingId ? `/items/${editingId}` : '/items', {
      method: editingId ? 'PATCH' : 'POST',
      json: payload,
    });
    notify(`${editingId ? 'Updated' : 'Created'} item #${saved.id}.`);
    resetItemForm();
    await refreshList();
  } catch (error) {
    notify(error.message, true);
  } finally {
    dom.itemSubmit.disabled = false;
  }
});

dom.itemCancel.addEventListener('click', resetItemForm);

dom.filterForm.addEventListener('submit', (event) => {
  event.preventDefault();
  state.limit = Math.max(1, Number(dom.filterForm.elements.limit.value) || DEFAULT_PAGE_SIZE);
  state.skip = 0;
  refreshList();
});

dom.filterClear.addEventListener('click', () => {
  dom.filterForm.reset();
  dom.filterForm.elements.limit.value = String(DEFAULT_PAGE_SIZE);
  state.skip = 0;
  state.limit = DEFAULT_PAGE_SIZE;
  refreshList();
});

dom.pagePrev.addEventListener('click', () => {
  state.skip = Math.max(0, state.skip - state.limit);
  refreshList();
});

dom.pageNext.addEventListener('click', () => {
  if (state.skip + state.limit < state.total) {
    state.skip += state.limit;
    refreshList();
  }
});

dom.predictForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  setText(dom.predictResult, 'Predicting...');

  const payload = {
    area_sqm: Number($('#areaSqm').value),
    bedrooms: Number($('#bedroomCount').value),
    distance_to_center_km: Number($('#distanceKm').value),
  };

  dom.predictSubmit.disabled = true;
  try {
    const { predicted_price, currency } = await callApi('/predict/house-price', {
      method: 'POST',
      json: payload,
    });
    setText(dom.predictResult, `Predicted price: ${priceFormat.format(predicted_price)} ${currency}`);
  } catch (error) {
    setText(dom.predictResult, error.message, true);
  } finally {
    dom.predictSubmit.disabled = false;
  }
});

refreshList();
