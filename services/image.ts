import * as FileSystem from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';

const IMAGE_DIR = `${FileSystem.documentDirectory}images/`;

async function ensureDir(): Promise<void> {
  try {
    const dirInfo = await FileSystem.getInfoAsync(IMAGE_DIR);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(IMAGE_DIR, { intermediates: true });
    }
  } catch (error) {
    console.error('创建图片目录失败:', error);
    throw new Error('无法创建图片存储目录');
  }
}

export async function saveImage(uri: string, filename: string): Promise<string> {
  await ensureDir();
  const dest = IMAGE_DIR + filename;

  try {
    // Verify source file exists
    const sourceInfo = await FileSystem.getInfoAsync(uri);
    if (!sourceInfo.exists) {
      throw new Error('源图片文件不存在');
    }

    // Copy the image
    await FileSystem.copyAsync({ from: uri, to: dest });

    // Verify the copy was successful
    const destInfo = await FileSystem.getInfoAsync(dest);
    if (!destInfo.exists) {
      throw new Error('图片保存失败');
    }

    return dest;
  } catch (error) {
    console.error('保存图片失败:', error);
    throw new Error(`保存图片失败: ${error instanceof Error ? error.message : '未知错误'}`);
  }
}

export async function deleteImage(path: string): Promise<void> {
  try {
    const info = await FileSystem.getInfoAsync(path);
    if (info.exists) {
      await FileSystem.deleteAsync(path);
    }
  } catch (error) {
    console.error('删除图片失败:', error);
    // Don't throw - allow deletion to continue even if file doesn't exist
  }
}

export async function pickImages(): Promise<string[]> {
  try {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      throw new Error('需要相册权限才能导入截图');
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      quality: 0.9,
      exif: false, // Don't need EXIF data
    });

    if (result.canceled) return [];

    // Filter out any invalid URIs
    const validUris: string[] = [];
    for (const asset of result.assets) {
      if (asset.uri && asset.uri.length > 0) {
        validUris.push(asset.uri);
      }
    }

    if (validUris.length === 0) {
      throw new Error('未选择有效的图片');
    }

    return validUris;
  } catch (error) {
    console.error('选择图片失败:', error);
    if (error instanceof Error && error.message.includes('相册权限')) {
      throw error;
    }
    throw new Error(`选择图片失败: ${error instanceof Error ? error.message : '未知错误'}`);
  }
}

export function generateFilename(): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `${timestamp}_${random}.jpg`;
}

// Helper function to check if image file exists
export async function imageExists(path: string): Promise<boolean> {
  try {
    const info = await FileSystem.getInfoAsync(path);
    return info.exists;
  } catch {
    return false;
  }
}
