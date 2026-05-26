const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// 添加对 .md 文件的支持
config.resolver.sourceExts = [...config.resolver.sourceExts, 'md'];

// 添加 .md 到资源扩展名
config.resolver.assetExts = [...config.resolver.assetExts, 'md'];

module.exports = config;
