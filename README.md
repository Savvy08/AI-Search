# ZapReq

<img width="300" height="300" alt="icon128" src="https://github.com/user-attachments/assets/397905f6-c63b-4907-870b-f799accbdc43" />


### EN
This browser extension automates a search cycle to simulate user activity. It performs the following actions:
Query Generation: Utilizes the Gemini API to generate relevant search queries based on the user's geographical region (determined by IP address).
Automated Browsing: Executes a search cycle every 2 minutes:
Opens a Google search with the generated query in a new tab.
The content script automatically navigates to the first organic result.
Remains on the site for 2 minutes without interaction.
Session Management: The extension runs for a maximum of 30 minutes per session before automatically shutting down.
Statistics & Logging: Records all activity to a Google Spreadsheet, including IP address, region, number of visits, and session duration.
Status Interface: Displays real-time status information in the popup (popup.html), such as the current search query, region, session timer, and visit count.

### RU
Данное расширение для браузера автоматизирует поисковые циклы для имитации пользовательской активности. Функционал включает:
Генерация запросов: Использует Gemini API для создания релевантных поисковых запросов на основе региона пользователя (определяется по IP-адресу).
Автоматизированный просмотр: Выполняет цикл поиска каждые 2 минуты:
Открывает поиск Google с созданным запросом в новой вкладке.
Контент-скрипт автоматически переходит на первый органический результат в выдаче.
Ожидает на сайте в течение 2 минут без совершения действий.
Управление сеансом: Работа расширения ограничена сессией в 30 минут, по истечении которых оно автоматически отключается.
Статистика и логирование: Записывает статистику в Google Таблицу, включая IP-адрес, регион, количество визитов и время работы.
Интерфейс статуса: Отображает текущую информацию в popup-окне (popup.html): активный поисковый запрос, регион, таймер сессии и счетчик посещений.

