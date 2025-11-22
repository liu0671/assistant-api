// api.js - 简化版，适合服务器部署
export default async function handler(request, response) {
  const { userLocation, facilityType, searchRadius } = request.body;
  
  // 这里放入您之前可用的查询逻辑
  const result = {
    code: 0,
    message: `成功在"${userLocation}"找到设施`,
    data: {
      location_used: userLocation,
      poi_list: [
        {
          id: "mock-1",
          name: "测试无障碍卫生间",
          address: "测试地址",
          type: "wheelchair_toilet",
          distance: 500
        }
      ]
    }
  };
  
  response.status(200).json(result);
}
