document.addEventListener('DOMContentLoaded', () => {
  // Загружаем сохранённые настройки
  chrome.storage.local.get([
    'geminiKey', 'openrouterKey', 'sessionDuration', 'stepDelay', 'fallbackQueries'
  ], (data) => {
    document.getElementById('geminiKey').value = data.geminiKey || '';
    document.getElementById('openrouterKey').value = data.openrouterKey || '';
    document.getElementById('sessionDuration').value = data.sessionDuration || 10;
    document.getElementById('stepDelay').value = data.stepDelay || 120;
    document.getElementById('fallbackQueries').value = (data.fallbackQueries || []).join("\n");
  });

  // Сохранение настроек
  document.getElementById('saveBtn').addEventListener('click', () => {
    const geminiKey = document.getElementById('geminiKey').value.trim();
    const openrouterKey = document.getElementById('openrouterKey').value.trim();
    const sessionDuration = parseInt(document.getElementById('sessionDuration').value, 10);
    const stepDelay = parseInt(document.getElementById('stepDelay').value, 10);
    const fallbackQueries = document.getElementById('fallbackQueries').value
                              .split("\n").map(q => q.trim()).filter(q => q);

    chrome.storage.local.set({
      geminiKey, openrouterKey, sessionDuration, stepDelay, fallbackQueries
    }, () => {
      alert("Настройки сохранены ✅");
    });
  });

  // Гайды — модальное окно
  const modal = document.getElementById('guideModal');
  const guideBtn = document.getElementById('guideBtn');
  const closeBtn = document.getElementById('closeGuide');

  guideBtn.addEventListener('click', () => {
    modal.style.display = 'flex';
  });

  closeBtn.addEventListener('click', () => {
    modal.style.display = 'none';
  });

  // Закрытие кликом вне окна
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.style.display = 'none';
    }
  });
});
