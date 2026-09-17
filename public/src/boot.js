(async () => {
  try {
    const urls = ['/resources/code-000.txt?v=2001','/resources/code-001.txt?v=2001','/resources/code-002.txt?v=2001','/resources/code-003.txt?v=2001','/resources/code-004.txt?v=2001','/resources/code-005.txt?v=2001','/resources/code-006.txt?v=2001','/resources/code-007.txt?v=2001']
    const parts = await Promise.all(urls.map(async url => {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`Не удалось загрузить ${url}`);
      return response.text();
    }));
    const script = document.createElement('script');
    script.src = URL.createObjectURL(new Blob([parts.join('\n')], { type: 'text/javascript' }));
    script.onload = () => URL.revokeObjectURL(script.src);
    document.body.appendChild(script);
  } catch (error) {
    document.getElementById('state').textContent = error.message;
    document.body.dataset.gameReady = 'error';
  }
})();
