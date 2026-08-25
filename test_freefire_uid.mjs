const url = 'https://shop2game.com/api/auth/player_id_login';

const response = await fetch(url, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'User-Agent': 'Mozilla/5.0'
  },
  body: JSON.stringify({
    app_id: 100067,
    login_id: '3619879816',
    region: 'IND'
  })
});

console.log('HTTP STATUS:', response.status);
console.log('CONTENT TYPE:', response.headers.get('content-type'));

const text = await response.text();

console.log('RESPONSE:');
console.log(text);
