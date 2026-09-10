document.getElementById('houseForm').addEventListener('submit', function (event) {
  event.preventDefault();

  const area = document.getElementById('area').value;
  const bedrooms = document.getElementById('bedrooms').value;
  const location = document.getElementById('location').value;
  const result = document.getElementById('result');

  result.innerHTML = `
    <strong>Thông tin đã nhập:</strong><br>
    Diện tích: ${area} m²<br>
    Số phòng ngủ: ${bedrooms}<br>
    Vị trí: ${location}
  `;
  result.style.display = 'block';
});
