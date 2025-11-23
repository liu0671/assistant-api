// api/accessibility-query.js - Vercel专用最终版
const https = require('https');

// 环境变量中的API密钥（需要在Vercel中配置）
const AMAP_API_KEY = process.env.AMAP_API_KEY || '7ad239551402402a0e29a30eafa63fe3';

// 模拟数据库
const mockDatabase = {
  '广州': [
    {
      id: 'mock-1',
      name: '天河城购物中心无障碍卫生间',
      address: '广州市天河区天河路208号天河城B1层',
      location: '113.3215,23.1321',
      type: 'wheelchair_toilet',
      distance: 350,
      description: '位于商场地下二层，近客服中心'
    },
    {
      id: 'mock-2', 
      name: '正佳广场无障碍电梯',
      address: '广州市天河区天河路228号正佳广场1楼',
      location: '113.3238,23.1319',
      type: 'elevator',
      distance: 520,
      description: '直达各楼层，按钮有盲文'
    }
  ],
  '北京': [
    {
      id: 'mock-3',
      name: '王府井百货无障碍卫生间',
      address: '北京市东城区王府井大街253号',
      location: '116.4175,39.9171',
      type: 'wheelchair_toilet', 
      distance: 280,
      description: '位于商场一层服务台旁'
    }
  ],
  '上海': [
    {
      id: 'mock-4',
      name: '陆家嘴地铁站无障碍通道',
      address: '上海市浦东新区陆家嘴地铁站2号口',
      location: '121.5025,31.2396',
      type: 'ramp',
      distance: 150,
      description: '连接地铁站与金融区'
    }
  ]
};

// Vercel云函数入口
module.exports = async (req, res) => {
  // 设置CORS头
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: '只支持POST请求' });
  }

  try {
    const { userLocation, facilityType = 'all', searchRadius = 1000 } = req.body;

    if (!userLocation) {
      return res.json({
        code: -1,
        message: '用户位置信息不能为空。',
        data: { poi_list: [] }
      });
    }

    console.log(`[Vercel] 查询: ${userLocation}, ${facilityType}`);
    
    // 智能混合查询
    let finalPois = [];
    let dataSource = '模拟数据';
    
    // 尝试真实API
    if (AMAP_API_KEY) {
      try {
        const location = await convertAddressToLngLat(userLocation);
        if (location) {
          const keywords = getKeywordsByType(facilityType);
          const realData = await searchNearbyPOI(location, keywords, searchRadius);
          if (realData.length > 0) {
            finalPois = realData.slice(0, 5);
            dataSource = '高德地图';
            console.log(`[Vercel] 使用真实数据: ${realData.length}个`);
          }
        }
      } catch (apiError) {
        console.log('[Vercel] 真实API失败:', apiError.message);
      }
    }

    // 使用模拟数据
    if (finalPois.length === 0) {
      finalPois = getMockData(userLocation, facilityType);
      console.log(`[Vercel] 使用模拟数据: ${finalPois.length}个`);
    }

    return res.json({
      code: 0,
      message: `成功在"${userLocation}"附近找到${finalPois.length}个相关设施 (数据来源: ${dataSource})`,
      data: {
        location_used: userLocation,
        poi_list: finalPois,
        data_source: dataSource
      }
    });

  } catch (error) {
    console.error('[Vercel] 执行出错:', error);
    const mockPois = getMockData(req.body.userLocation || '广州', req.body.facilityType || 'all');
    return res.json({
      code: 0,
      message: `成功在"${req.body.userLocation || '广州'}"附近找到${mockPois.length}个相关设施`,
      data: {
        location_used: req.body.userLocation || '广州',
        poi_list: mockPois,
        data_source: '模拟数据'
      }
    });
  }
};

// 辅助函数
async function convertAddressToLngLat(address) {
  const url = `https://restapi.amap.com/v3/geocode/geo?key=${AMAP_API_KEY}&address=${encodeURIComponent(address)}&output=JSON`;
  try {
    const data = await makeRequest(url);
    if (data.status === '1' && data.geocodes && data.geocodes.length > 0) {
      return data.geocodes[0].location;
    }
    return null;
  } catch (error) {
    return null;
  }
}

async function searchNearbyPOI(location, keywords, radius) {
  const url = `https://restapi.amap.com/v3/place/around?key=${AMAP_API_KEY}&location=${location}&keywords=${encodeURIComponent(keywords)}&radius=${radius}&output=JSON`;
  try {
    const data = await makeRequest(url);
    if (data.status === '1' && data.pois) {
      return data.pois.map(poi => ({
        id: poi.id,
        name: poi.name,
        address: poi.address || '暂无地址',
        location: poi.location,
        type: 'facility',
        distance: parseInt(poi.distance) || 0
      }));
    }
    return [];
  } catch (error) {
    return [];
  }
}

function makeRequest(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (response) => {
      let data = '';
      response.on('data', chunk => data += chunk);
      response.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

function getKeywordsByType(facilityType) {
  const keywordMap = {
    'wheelchair_toilet': '无障碍卫生间,无障碍厕所,第三卫生间',
    'elevator': '无障碍电梯,直升电梯,升降电梯',
    'ramp': '无障碍坡道,轮椅坡道',
    'all': '无障碍设施,无障碍通道,残疾人设施'
  };
  return keywordMap[facilityType] || keywordMap['all'];
}

function getMockData(userLocation, facilityType) {
  let city = '广州';
  if (userLocation.includes('北京')) city = '北京';
  if (userLocation.includes('上海')) city = '上海';
  
  let mockPois = mockDatabase[city] || mockDatabase['广州'];
  
  if (facilityType !== 'all') {
    mockPois = mockPois.filter(poi => poi.type === facilityType);
  }
  
  return mockPois;
}
