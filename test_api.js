const http = require('http');

const loginOptions = {
  hostname: 'localhost',
  port: 8080,
  path: '/api/auth/login',
  method: 'POST',
  headers: {
    'Content-Type': 'application/x-www-form-urlencoded'
  }
};

const req = http.request(loginOptions, (res) => {
  let cookie = res.headers['set-cookie'];
  
  const listOptions = {
    hostname: 'localhost',
    port: 8080,
    path: '/api/tickets/list',
    method: 'GET',
    headers: {
      'Cookie': cookie ? cookie.join(';') : ''
    }
  };

  const listReq = http.request(listOptions, (listRes) => {
    let data = '';
    listRes.on('data', (chunk) => data += chunk);
    listRes.on('end', () => {
      console.log('STATUS:', listRes.statusCode);
      console.log('BODY:', data);
    });
  });
  listReq.end();
});
req.write('username=Anmol0001&password=Anmol0001');
req.end();
