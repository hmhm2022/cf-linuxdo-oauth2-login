# cf-linuxdo-oauth2-login

这是一个基于 Cloudflare Workers 的 Linux.do OAuth2 认证服务，用于快速接入 Linux.do 的 OAuth2 认证。

## 功能特点

- 简化 Linux.do OAuth2 认证流程
- 支持跨域请求 (CORS)
- 轻量级实现，无需服务器
- 易于部署和配置
- 使用 KV 存储管理会话

## 部署步骤

### 1. 克隆项目

```bash
git clone https://github.com/hmhm2022/cf-linuxdo-oauth2-login.git
cd cf-linuxdo-oauth2-login
```

### 2. 安装依赖

```bash
npm install
```

### 3. 配置环境变量

创建 `.dev.vars` 文件用于本地开发：

```
LD_CLIENT_ID=your_client_id_here
LD_CLIENT_SECRET=your_client_secret_here
```

对于生产环境，使用 Wrangler secrets：

```bash
wrangler secret put LD_CLIENT_ID
wrangler secret put LD_CLIENT_SECRET
```

### 4. 配置 KV 命名空间

创建一个 KV 命名空间用于存储会话：

```bash
wrangler kv:namespace create SESSIONS
```

然后更新 `wrangler.toml` 中的 KV 命名空间 ID。

### 5. 部署 Worker

```bash
npx wrangler publish
```

或使用 npm 脚本：

```bash
npm run deploy
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
| `/dashboard` | GET | 用户仪表板 |
| `/logout` | POST | 登出用户 |

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

## 项目结构

```
cf-linuxdo-oauth2-login/
├── public/                # 静态资源
│   ├── index.html        # 登录页面
│   ├── dashboard.html    # 用户仪表板
│   ├── styles.css        # 样式表
│   └── scripts.js        # 客户端脚本
├── src/
│   └── index.js          # 主要应用逻辑
├── .dev.vars             # 本地开发环境变量（不包含在版本控制中）
├── wrangler.toml         # Wrangler 配置
└── package.json          # 项目依赖和脚本
```

## 本地开发

启动开发服务器（默认端口 3000）：

```bash
npx wrangler dev
```

或使用 npm 脚本：

```bash
npm run dev
```

访问 http://localhost:3000 查看应用。

## 许可证

MIT 