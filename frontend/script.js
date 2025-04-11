document.addEventListener("DOMContentLoaded", () => {
    const button = document.getElementById("fetchButton");
    const input = document.getElementById("symbolInput");
    const resultDiv = document.getElementById("resultDiv");
  
    button.addEventListener("click", async () => {
      const symbol = input.value.trim().toUpperCase();
      resultDiv.textContent = "Loading...";
  
      try {
        const response = await fetch(`/api/stock/${symbol}`);
        const data = await response.json();
  
        if (data.error) {
          resultDiv.textContent = data.error;
        } else {
          resultDiv.innerHTML = `
            <h3>${data.symbol} — ${data.date}</h3>
            <p><strong>Open:</strong> $${parseFloat(data.open).toFixed(2)}</p>
            <p><strong>High:</strong> $${parseFloat(data.high).toFixed(2)}</p>
            <p><strong>Low:</strong> $${parseFloat(data.low).toFixed(2)}</p>
            <p><strong>Close:</strong> $${parseFloat(data.close).toFixed(2)}</p>
            <p><strong>Volume:</strong> ${parseInt(data.volume).toLocaleString()}</p>
          `;
        }
      } catch (error) {
        resultDiv.textContent = "Error fetching stock data.";
      }
    });
});
  