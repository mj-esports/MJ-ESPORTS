const uid = '3619879816';
const region = 'IND';

const url =
  `https://free-ff-api-src-5plp.onrender.com/api/v1/account?region=${region}&uid=${uid}`;

console.log('Testing Free Fire UID:', uid);
console.log('Region:', region);
console.log('URL:', url);

try {
  const response = await fetch(url);

  console.log('HTTP STATUS:', response.status);

  const text = await response.text();

  console.log('RESPONSE:');
  console.log(text);
} catch (error) {
  console.error('REQUEST FAILED:', error);
}