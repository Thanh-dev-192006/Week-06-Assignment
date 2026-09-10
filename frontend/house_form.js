document.getElementById('houseForm').addEventListener('submit', async function (event) {
  event.preventDefault();

  const area = parseFloat(document.getElementById('area').value);
  const bedrooms = parseInt(document.getElementById('bedrooms').value, 10);
  const location = document.getElementById('location').value;
  const result = document.getElementById('result');

  result.textContent = 'Đang tính giá...';
  result.style.display = 'block';

  const params = new URLSearchParams({
    area: area.toString(),
    bedrooms: bedrooms.toString(),
    location,
  });

  try {
    const response = await fetch(`/predict?${params.toString()}`);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    const formattedPrice = new Intl.NumberFormat('vi-VN').format(data.predicted_price);
    result.innerHTML = `<strong>Giá dự đoán:</strong> ${formattedPrice} VND`;
  } catch (error) {
    result.textContent = 'Không thể gọi API dự đoán. Vui lòng thử lại.';
    console.error(error);
  }
});
