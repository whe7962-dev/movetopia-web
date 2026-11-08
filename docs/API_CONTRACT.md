# 前后端接口契约草案

状态：**提议，未实现，待后端确认**。当前演示不会调用以下接口。字段和限额不能视作现有服务承诺。

## 公共约定

- 推荐前缀 `/api/v1`，JSON UTF-8，时间 ISO 8601 UTC。
- 提议采用匿名短期会话令牌：仅在内存保存，由后端验证资源归属。若复用现有账号，应整体替换本节。
- 除创建会话外，接口携带 `Authorization: Bearer <sessionToken>`。该令牌不是模型厂商 API key。
- 全部返回 `X-Request-Id`；错误对象包括同一 requestId。
- 创建 / 上传后可用 CORS 时返回精确允许来源；同域代理优先。跨域方案另行确认，不能用带凭证的 `*`。

## 接口清单

| 方法与路径 | 输入 | 成功 |
| --- | --- | --- |
| POST `/sessions` | 无个人信息 | 201，短期会话 token / expiresAt |
| POST `/photos` | multipart：file、consentVersion、consentAcceptedAt | 201，photoId / width / height / mimeType / expiresAt |
| POST `/generations` | photoId / styleId，Header `Idempotency-Key` | 202，jobId / status / createdAt / pollAfterMs |
| GET `/generations/{jobId}` | 授权主体拥有的 jobId | 200，任务状态；成功时含 result |
| DELETE `/generations/{jobId}` | jobId | 202，取消请求已接受；不代表已立即停止 |
| GET `/generations/{jobId}/download` | 成功且未过期任务 | 200 图片二进制与下载头 |
| DELETE `/photos/{photoId}` | 未被活动任务占用的原图 | 204；活动任务占用时 409 |

`DELETE /photos` 是否同步删除关联结果，以及取消是否退费，需要产品与后端另行决定；本草案不作承诺。

## 会话

```json
{
  "sessionToken": "<opaque-short-lived-token>",
  "expiresAt": "2026-11-08T12:00:00Z"
}
```

有效期由服务端配置，前端不得自行延长。401 时重新获取授权，不自动跨会话访问旧任务。

## 上传

`multipart/form-data` 的 `file` 为用户确认后的照片，不包含实时视频。`consentVersion` 和 `consentAcceptedAt` 用于对齐产品说明版本与确认动作，不替代后续正式隐私方案。

建议初始限制：JPEG / PNG / WebP，单张 10 MiB、2500 万像素以内；**这些数值尚待后端确认**。服务端应检查真实文件内容，不只信任扩展名或 Content-Type。

```json
{
  "photoId": "photo_example",
  "width": 1536,
  "height": 1024,
  "mimeType": "image/jpeg",
  "expiresAt": "2026-11-09T00:00:00Z"
}
```

前端使用本地 Blob URL 预览原图，不要求后端返回公开原图 URL。

## 创建任务与幂等

```http
POST /api/v1/generations
Authorization: Bearer <sessionToken>
Idempotency-Key: <client-generated-uuid>
Content-Type: application/json
```

```json
{ "photoId": "photo_example", "styleId": "yoga-natural-v1" }
```

`yoga-natural-v1` 只是建议的首版服务端风格 ID，不表示模型已支持。用户界面本轮不新增复杂风格选择器。

```json
{
  "jobId": "job_example",
  "status": "queued",
  "createdAt": "2026-11-08T00:00:00Z",
  "pollAfterMs": 2000
}
```

同一会话中，同一幂等键与相同请求体应返回同一 job；请求体不同返回 409。网络超时重发保留原键；明确失败后用户主动重新生成，使用新键。服务端保留幂等记录的时长需确认，不能由前端保证不重复计费。

## 查询与结果

状态机：`queued → running → succeeded | failed | cancelled`。取消期间仍可返回 queued / running；终态一旦确定不再反转。成功先于取消完成时，可返回 succeeded。

```json
{
  "jobId": "job_example",
  "photoId": "photo_example",
  "status": "succeeded",
  "updatedAt": "2026-11-08T00:01:20Z",
  "result": {
    "previewUrl": "https://<result-host>/<signed-result-path>",
    "downloadPath": "/api/v1/generations/job_example/download",
    "width": 1536,
    "height": 2048,
    "mimeType": "image/jpeg",
    "expiresAt": "2026-11-09T00:01:20Z"
  },
  "error": null
}
```

非成功状态 `result` 为 null；failed 必须有稳定错误 code / message / retryable。queued / running 返回建议的 pollAfterMs；建议前端按 2–5 秒轮询，网络失败退避，429 遵守 Retry-After。前端停止轮询不代表任务已取消。

首版不定义 percentage。如果后端未来提供真实进度，应补充其来源与语义；前端不可用计时器伪造真实百分比。

## 下载

返回图片二进制，正确的 `Content-Type`、`Content-Disposition: attachment`，建议 `Cache-Control: private, no-store`。使用 Bearer 时，前端通过 fetch 获取 Blob 再触发下载；不要把 token 写进 URL。

过期任务返回 410，未成功任务返回 409。签名预览 URL 需限制有效期；如通过跨域 fetch 下载，应有明确 CORS，而不是只保证 img 标签能显示。

## 错误

```json
{
  "error": {
    "code": "GENERATION_FAILED",
    "message": "本次未能生成写真，请稍后重试。",
    "retryable": true,
    "requestId": "req_example"
  }
}
```

| HTTP | 建议 code | 前端行为 |
| --- | --- | --- |
| 400 | INVALID_REQUEST / INVALID_IMAGE | 指出对应字段或重选图片，不盲目重试 |
| 401 | SESSION_EXPIRED | 提示会话失效，重新授权 |
| 403 / 404 | ACCESS_DENIED / NOT_FOUND | 停止访问，不泄露他人资源信息 |
| 409 | IDEMPOTENCY_CONFLICT / RESOURCE_BUSY / JOB_NOT_READY | 按场景保留选择并提示 |
| 410 | RESOURCE_EXPIRED | 提示重传 / 重新生成，不展示失效资源 |
| 413 / 415 | IMAGE_TOO_LARGE / UNSUPPORTED_IMAGE | 重选合规图片 |
| 429 | RATE_LIMITED | 根据 Retry-After 等待，不自动密集重试 |
| 5xx | SERVICE_UNAVAILABLE / GENERATION_FAILED | 保留已选照片，允许用户重试 |

以上 code、认证方式、上传限额、有效期、取消 / 删除语义必须在真实接入前确认。后端需提供每种终态与错误的测试样例。
