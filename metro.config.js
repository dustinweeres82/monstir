const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Allow uppercase .MP4 files (in addition to lowercase .mp4)
config.resolver.assetExts.push('MP4');

module.exports = config;
