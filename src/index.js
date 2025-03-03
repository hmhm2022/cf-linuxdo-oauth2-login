/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `npm run dev` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `npm run deploy` to publish your worker
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */

/**
 * ld-oauth2 for Cloudflare Workers
 * 
 * 这是一个将 ld-oauth2 项目迁移到 Cloudflare Workers 的实现
 * 用于快速接入 Linux.do 的 OAuth2 认证
 */

// 配置信息
const config = {
	// Linux.do OAuth2 配置
	LD_CLIENT_ID: '', // 需要在环境变量中设置
	LD_CLIENT_SECRET: '', // 需要在环境变量中设置
	LD_REDIRECT_URI: '', // 需要在环境变量中设置
	
	// Linux.do OAuth2 端点 - 更新为正确的端点
	LD_AUTH_URL: 'https://connect.linux.do/oauth2/authorize',
	LD_TOKEN_URL: 'https://connect.linux.do/oauth2/token',
	LD_USER_INFO_URL: 'https://connect.linux.do/api/user',
	
	// 应用配置
	CORS_ORIGINS: '*',
};

// 处理 CORS 请求的辅助函数
function handleCors(request) {
	// 获取请求的 Origin
	const origin = request.headers.get('Origin') || '*';
	
	// 预检请求处理
	if (request.method === 'OPTIONS') {
		return new Response(null, {
			headers: {
				'Access-Control-Allow-Origin': config.CORS_ORIGINS === '*' ? origin : config.CORS_ORIGINS,
				'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
				'Access-Control-Allow-Headers': 'Content-Type, Authorization',
				'Access-Control-Max-Age': '86400',
			},
		});
	}
	
	// 返回 CORS 头信息，供后续使用
	return {
		'Access-Control-Allow-Origin': config.CORS_ORIGINS === '*' ? origin : config.CORS_ORIGINS,
		'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
		'Access-Control-Allow-Headers': 'Content-Type, Authorization',
	};
}

// 生成随机状态值
function generateState() {
	return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

// 构建授权 URL
function buildAuthUrl(state) {
	const url = new URL(config.LD_AUTH_URL);
	url.searchParams.append('client_id', config.LD_CLIENT_ID);
	url.searchParams.append('redirect_uri', config.LD_REDIRECT_URI);
	url.searchParams.append('response_type', 'code');
	url.searchParams.append('state', state);
	return url.toString();
}

// 处理授权回调，获取访问令牌
async function handleCallback(code) {
	// 创建 Basic 认证头
	const credentials = `${config.LD_CLIENT_ID}:${config.LD_CLIENT_SECRET}`;
	const encodedCredentials = btoa(credentials);
	
	const params = new URLSearchParams();
	params.append('grant_type', 'authorization_code');
	params.append('code', code);
	params.append('redirect_uri', config.LD_REDIRECT_URI);
	
	const response = await fetch(config.LD_TOKEN_URL, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/x-www-form-urlencoded',
			'Authorization': `Basic ${encodedCredentials}`,
			'Accept': 'application/json'
		},
		body: params,
	});
	
	if (!response.ok) {
		throw new Error(`获取访问令牌失败: ${response.status} ${response.statusText}`);
	}
	
	return response.json();
}

// 获取用户信息
async function getUserInfo(accessToken) {
	const response = await fetch(config.LD_USER_INFO_URL, {
		headers: {
			'Authorization': `Bearer ${accessToken}`,
			'Accept': 'application/json'
		},
	});
	
	if (!response.ok) {
		throw new Error(`获取用户信息失败: ${response.status} ${response.statusText}`);
	}
	
	const userData = await response.json();
	console.log('Linux.do API返回的用户数据:', JSON.stringify(userData, null, 2));
	return userData;
}

// 处理静态文件的MIME类型
const MIME_TYPES = {
	'html': 'text/html',
	'css': 'text/css',
	'js': 'application/javascript',
	'png': 'image/png',
	'jpg': 'image/jpeg',
	'jpeg': 'image/jpeg',
	'gif': 'image/gif',
	'json': 'application/json',
	'svg': 'image/svg+xml'
};

// 获取文件扩展名对应的MIME类型
function getMimeType(filename) {
	const ext = filename.split('.').pop().toLowerCase();
	return MIME_TYPES[ext] || 'text/plain';
}

// 处理静态资源请求
async function handleAsset(request, env) {
	const url = new URL(request.url);
	let path = url.pathname;
	
	// 如果是根路径，默认返回index.html
	if (path === '/') {
		path = '/index.html';
	}

	// 创建一个新的请求对象，确保路径正确
	const assetUrl = new URL(path, url.origin);
	const assetRequest = new Request(assetUrl, request);

	// 从Assets绑定中获取静态资源
	const asset = await env.ASSETS.fetch(assetRequest);
	if (asset.status === 404) {
		return new Response('Not Found', { status: 404 });
	}

	// 设置正确的Content-Type
	const response = new Response(asset.body, asset);
	response.headers.set('Content-Type', getMimeType(path));
	return response;
}

// 主处理函数
export default {
	async fetch(request, env, ctx) {
		// 设置配置信息
		config.LD_CLIENT_ID = env.LD_CLIENT_ID || config.LD_CLIENT_ID;
		config.LD_CLIENT_SECRET = env.LD_CLIENT_SECRET || config.LD_CLIENT_SECRET;
		config.LD_REDIRECT_URI = env.LD_REDIRECT_URI || config.LD_REDIRECT_URI;
		
		// 处理 CORS
		const corsHeaders = handleCors(request);
		if (request.method === 'OPTIONS') {
			return corsHeaders;
		}
		
		// 解析 URL 和路径
		const url = new URL(request.url);
		const path = url.pathname;
		
		try {
			// 路由处理
			if (path === '/authorize') {
				// 生成状态值并重定向到授权页面
				const state = generateState();
				const authUrl = buildAuthUrl(state);
				return Response.redirect(authUrl, 302);
			} 
			else if (path === '/callback') {
				// 处理授权回调
				const code = url.searchParams.get('code');
				const state = url.searchParams.get('state');
				
				if (!code) {
					throw new Error('授权码缺失');
				}
				
				// 获取访问令牌
				const tokenData = await handleCallback(code);
				
				// 存储访问令牌到会话中
				const sessionId = crypto.randomUUID();
				await env.SESSIONS.put(sessionId, JSON.stringify(tokenData), {expirationTtl: 3600});
				
				// 设置会话Cookie并重定向到用户信息页面
				const dashboardUrl = new URL('/dashboard.html', url.origin).toString();
				
				// 创建一个带有所需头信息的响应
				return new Response(null, {
					status: 302,
					headers: {
						'Location': dashboardUrl,
						'Set-Cookie': `session=${sessionId}; Path=/; HttpOnly; SameSite=Lax; Max-Age=3600`,
						...corsHeaders
					}
				});
			} 
			else if (path === '/userinfo') {
				// 从Cookie中获取会话ID
				const cookies = request.headers.get('Cookie') || '';
				const sessionId = cookies.split(';').find(c => c.trim().startsWith('session='))?.split('=')[1];
				
				if (!sessionId) {
					return new Response(JSON.stringify({error: '未登录'}), {
						status: 401,
						headers: {
							'Content-Type': 'application/json',
							...corsHeaders,
						},
					});
				}
				
				// 从会话中获取访问令牌
				const sessionData = await env.SESSIONS.get(sessionId);
				if (!sessionData) {
					return new Response(JSON.stringify({error: '会话已过期'}), {
						status: 401,
						headers: {
							'Content-Type': 'application/json',
							...corsHeaders,
						},
					});
				}
				
				const tokenData = JSON.parse(sessionData);
				const accessToken = tokenData.access_token;
				
				// 获取用户信息
				const userInfo = await getUserInfo(accessToken);
				
				return new Response(JSON.stringify(userInfo), {
					headers: {
						'Content-Type': 'application/json',
						...corsHeaders,
					},
				});
			}
			else if (path === '/logout') {
				// 处理退出登录
				const cookies = request.headers.get('Cookie') || '';
				const sessionId = cookies.split(';').find(c => c.trim().startsWith('session='))?.split('=')[1];
				
				if (sessionId) {
					// 删除会话
					await env.SESSIONS.delete(sessionId);
				}
				
				// 清除Cookie
				const response = new Response(JSON.stringify({success: true}), {
					headers: {
						'Content-Type': 'application/json',
						'Set-Cookie': 'session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0',
						...corsHeaders,
					},
				});
				
				return response;
			}
			else {
				// 尝试提供静态资源
				return handleAsset(request, env);
			}
		} catch (error) {
			// 错误处理
			console.error('Error:', error);
			return new Response(JSON.stringify({
				error: error.message || '未知错误',
			}), {
				status: 400,
				headers: {
					'Content-Type': 'application/json',
					...corsHeaders,
				},
			});
		}
	},
};
