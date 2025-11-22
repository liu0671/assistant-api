// server.js - 将插件包装成HTTP服务
const http = require('http');
const { AccessibilityMapQuery } = require('./mapService.js');

const server = http.createServer(async (req, res) => {
  // 设置CORS头，允许跨域访问
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // 处理预检请求
  if (req.method === 'OPTIONS') {
    res.statusCode = 200;
    res.end();
    return;
  }

  // 只处理POST请求
  if (req.method === 'POST' && req.url === '/api/accessibility-query') {
    try {
      let body = '';
      req.on('data', chunk => body += chunk);
      
      req.on('end', async () => {
        try {
          const params = JSON.parse(body);
          console.log('收到请求参数:', params);
          
          // 调用您的插件函数
          const result = await AccessibilityMapQuery(
            params.userLocation, 
            params.facilityType, 
            params.searchRadius
          );
          
          res.statusCode = 200;
          res.end(JSON.stringify(result));
          
        } catch (parseError) {
          res.statusCode = 400;
          res.end(JSON.stringify({
            code: -1,
            message: '请求参数格式错误',
            data: { poi_list: [] }
          }));
        }
      });
      
    } catch (error) {
      res.statusCode = 500;
      res.end(JSON.stringify({
        code: -1,
        message: '服务器内部错误',
        data: { poi_list: [] }
      }));
    }
  } else {
    res.statusCode = 404;
    res.end(JSON.stringify({
      code: -1,
      message: '接口不存在',
      data: { poi_list: [] }
    }));
  }
});

// 启动服务器
const PORT = 3000;
server.listen(PORT, () => {
  console.log(`无障碍设施查询服务已启动: http://localhost:${PORT}/api/accessibility-query`);
  console.log('测试命令:');
  console.log(`curl -X POST http://localhost:${PORT}/api/accessibility-query -H "Content-Type: application/json" -d '{"userLocation":"广州天河区","facilityType":"wheelchair_toilet"}'`);
});
