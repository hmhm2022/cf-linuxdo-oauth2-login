# ld-oauth2-worker

这是一个基于 Cloudflare Workers 的 Linux.do OAuth2 认证服务，用于快速接入 Linux.do 的 OAuth2 认证。

## 功能特点

- 简化 Linux.do OAuth2 认证流程
- 支持跨域请求 (CORS)
- 轻量级实现，无需服务器
- 易于部署和配置

## 部署步骤

### 1. 克隆项目

```bash
git clone https://github.com/yourusername/ld-oauth2-worker.git
cd ld-oauth2-worker
```

### 2. 安装依赖

```bash
npm install
```

### 3. 配置环境变量

在 Cloudflare Workers 控制台中，为你的 Worker 设置以下环境变量：

- `LD_CLIENT_ID`: 你在 Linux.do 注册的应用的客户端 ID
- `LD_CLIENT_SECRET`: 你在 Linux.do 注册的应用的客户端密钥
- `LD_REDIRECT_URI`: 你的应用的回调 URL，应该指向 `/callback` 路径

### 4. 部署 Worker

```bash
npx wrangler publish
```

## 使用方法

### 1. 授权流程

1. 将用户重定向到 `https://your-worker.your-subdomain.workers.dev/authorize`
2. 用户在 Linux.do 上完成授权
3. Linux.do 将用户重定向回 `LD_REDIRECT_URI`，带有授权码
4. Worker 处理回调，获取访问令牌并返回

### 2. 获取用户信息

发送 GET 请求到 `https://your-worker.your-subdomain.workers.dev/userinfo`，并在请求头中包含访问令牌：

```
Authorization: Bearer YOUR_ACCESS_TOKEN
```

## API 端点

| 端点 | 方法 | 描述 |
|------|------|------|
| `/` | GET | 返回 API 信息 |
| `/authorize` | GET | 开始授权流程 |
| `/callback` | GET | 处理授权回调 |
| `/userinfo` | GET | 获取用户信息 |

## 示例代码

### 前端 JavaScript

```javascript
// 开始授权流程
function startAuth() {
  window.location.href = 'https://your-worker.your-subdomain.workers.dev/authorize';
}

// 处理回调
async function handleCallback(code) {
  const response = await fetch('https://your-worker.your-subdomain.workers.dev/callback?code=' + code);
  const data = await response.json();
  localStorage.setItem('access_token', data.access_token);
  return data;
}

// 获取用户信息
async function getUserInfo() {
  const token = localStorage.getItem('access_token');
  const response = await fetch('https://your-worker.your-subdomain.workers.dev/userinfo', {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  return response.json();
}
```

## 本地开发

```bash
npx wrangler dev
```

## 许可证

MIT 