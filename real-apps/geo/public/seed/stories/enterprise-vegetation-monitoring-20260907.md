# 对公开演示 AOI 比较 2024 与 2025 年 5–9 月的 Sentinel-2 NDVI，交付可核对的年度统计、地图及变化说明。

## Claims

## Findings
- **seasonal-vegetation-change**: mixed. 公开演示 AOI 在相同的 5–9 月窗口中，年度 NDVI 均值从 2024 年的 0.3447 增至 2025 年的 0.3847，绝对变化 +0.0400。 补充质量实算后，两年 NDVI 数值与原统计一致；2024 / 2025 年分别有 62 / 74 景入选影像，最终合成有效覆盖率均为 100%。 指标来自完成的 Earth Engine 实算，变化 GeoTIFF 已通过本地导出作业保存。 这是植被光谱信号的年度差异；现有证据不足以把变化归因于绿化工程，或据此通过生态修复验收。

## Evidence Review
- Status: passed
- Blocking: 0
- Warnings: 0

## Uncertainty
- AOI 是公开坐标的演示矩形，不代表真实客户园区或地块权属。
- 2024 年入选 62 景，2025 年入选 74 景；影像数量是时间与区域筛选后的集合条目数。两年最终合成结果均覆盖 49,729 / 49,729 个 AOI 网格（100%），不表示每景无云，也不代表已完成空间精度或因果验证。
- SCL 排除了云阴影、云、卷云与雪冰类别，但不能保证完全去除大气、阴影和混合像元影响。
- 两年的光谱差异还可能受降水、物候、土地利用、成像质量和合成方法影响；没有因果对照。
- NDVI 均值及有效覆盖统计使用同一 EPSG:4326 投影、10 米名义尺度网格，禁止自动粗化；空间置信区间尚未估计。GeoTIFF 的经纬度坐标单位不应理解为米。

## Reproducibility
```json
{
  "planId": "plan_16039587db4b_91668a",
  "jobIds": [
    "earth_20260907120250_9dff6f77",
    "earth_20260907102039_60a846f4"
  ],
  "authorType": "agent",
  "authoringMethod": "source-grounded local synthesis; no model-generated measurements",
  "knowledgeIndexId": "lab-trial:2228083e9631487385885c5afecea666",
  "qualitySchemaVersion": "scoutpi.annual-quality.v1"
}
```
