async function test() {
  const url = 'http://localhost:3000/api/ml/predict';
  const body = { case_id: 'CASE_MEERA_DEMO_001' };
  try {
    const r = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    console.log('Status:', r.status);
    const text = await r.text();
    console.log('Body:', text);
  } catch (e) {
    console.log('Error:', e.message);
  }
}
test();
