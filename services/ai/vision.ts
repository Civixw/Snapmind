import * as FileSystem from 'expo-file-system';
import { getCurrentProviderConfig } from './config';

const FETCH_TIMEOUT = 30000;

async function fetchWithTimeout(url: string, options: RequestInit, timeout = FETCH_TIMEOUT): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    return response;
  } finally {
    clearTimeout(timer);
  }
}

export type SensitiveFlag =
  | 'id_card'
  | 'bank_card'
  | 'phone'
  | 'chat_record'
  | 'password'
  | 'private_photo';

export interface AnalysisResult {
  raw_text: string;
  summary: string;
  category: string;
  tags: string[];
  city: string | null;
  importance_score: number;
  sensitive_flags: SensitiveFlag[];
}

export async function analyzeScreenshot(imageUri: string): Promise<AnalysisResult> {
  const config = await getCurrentProviderConfig();

  const base64 = await FileSystem.readAsStringAsync(imageUri, {
    encoding: FileSystem.EncodingType.Base64,
  });

  const estimatedSize = base64.length * 0.75;
  if (estimatedSize > 20 * 1024 * 1024) {
    throw new Error('图片太大，请选择小于20MB的图片');
  }

  const response = await fetchWithTimeout(`${config.apiBaseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: config.visionModel,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image_url',
              image_url: {
                url: `data:image/jpeg;base64,${base64}`,
                detail: 'low'
              },
            },
            {
              type: 'text',
              text: `分析这张截图，返回纯JSON（不要markdown代码块）：

重要性评分说明：综合评估截图的实用价值，返回0-100之间的整数。
评分参考标准（非硬性累加，请根据实际情况综合判断）：
- 待办事项、日期时间类：高分段（70-100）
- 订单/票据/备忘录类：中高分段（60-90）
- 地址、电话、链接类：中分段（50-80）
- 信息密度高（文字多、有结构）：中高分段（60-90）
- 普通聊天/学习/购物：中分段（40-70）
- 纯美食/风景图片：低分段（0-40）

敏感信息检测：检查图中是否包含以下类型的敏感信息，返回检测到的类型数组：
- id_card: 身份证、护照、驾驶证等证件号码
- bank_card: 银行卡号、信用卡号
- phone: 电话号码
- chat_record: 聊天记录、对话内容
- password: 密码、验证码、PIN码
- private_photo: 私密照片、不雅内容

示例输出：
{
  "raw_text": "识别图中所有文字内容",
  "summary": "1-2句中文摘要，概括这张截图的用途和关键信息",
  "category": "美食|购物|旅行|聊天|学习|健身|灵感|待办 中选一个",
  "tags": ["标签1", "标签2", "标签3"],
  "city": "如果图中提到城市名则提取，否则null",
  "importance_score": 65,
  "sensitive_flags": ["phone", "chat_record"]
}

如果没有检测到敏感信息，sensitive_flags 返回空数组 []`,
            },
          ],
        },
      ],
      max_tokens: 500,
      temperature: 0.3,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`${config.name} API错误: ${response.status} ${err}`);
  }

  const data = await response.json();
  const content = data.choices[0].message.content;

  const cleanJson = content
    .replace(/```json\n?/g, '')
    .replace(/```\n?/g, '')
    .trim();

  try {
    const parsed = JSON.parse(cleanJson);

    if (typeof parsed.importance_score !== 'number') {
      parsed.importance_score = 50;
    } else {
      parsed.importance_score = Math.max(0, Math.min(100, parsed.importance_score));
    }
    return parsed;
  } catch (e) {
    console.error('JSON解析失败:', cleanJson);
    return {
      raw_text: '',
      summary: '无法解析AI返回结果',
      category: '待办',
      tags: [],
      city: null,
      importance_score: 50,
      sensitive_flags: [],
    };
  }
}