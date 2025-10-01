~~для подключение гугл таблицы сделай следующие:~~

~~<img width="335" height="223" alt="image" src="https://github.com/user-attachments/assets/5fb6dd9f-1349-42b4-9142-4993089abceb" />~~

~~вставь вот этот скрипт:~~

~~script
function doPost(e) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Лист1");
  const data = JSON.parse(e.postData.contents);~~

  ~~sheet.appendRow([
    data.ip,
    data.visits,
    data.runtime
  ]);~~

  ~~return ContentService.createTextOutput("OK");
}~~

~~дальше жмешь сюда:~~

~~<img width="258" height="216" alt="image" src="https://github.com/user-attachments/assets/521acba4-8574-48db-a1c6-16f939d627b9" />~~

~~выберите тип:~~
~~1. "Веб приложение" - у кого есть доступ, выбираешь "все"~~
~~2. Начать развертывание~~
~~3. Копируешь ссылку "Веб приложения", ссылка начинается так: "https://script.google.com/macros/"~~
