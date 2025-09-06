/**
 * 媒体浏览器 API
 * 根据设备能力自动选择合适的视频格式
 */

(function() {
  'use strict';

  // 根域名配置
  const BASE_URL = 'https://media.huawei.moe';
  const MANIFEST_URL = `${BASE_URL}/streaming_manifest.json`;

  // 缓存清单数据
  let manifestCache = null;
  let cacheTimestamp = 0;
  const CACHE_DURATION = 5 * 60 * 1000; // 5分钟缓存
  
  // 用于追踪最近选择的文件，避免重复
  let recentSelections = {
    av1: [],
    hevc: []
  };
  const RECENT_HISTORY_SIZE = 5; // 记录最近5个选择

  /**
   * 生成加密安全的随机数
   * @param {number} max - 最大值（不包含）
   * @returns {number} 0 到 max-1 之间的随机整数
   */
  function getSecureRandomInt(max) {
    // 使用 Web Crypto API 生成加密安全的随机数
    if (window.crypto && window.crypto.getRandomValues) {
      // 计算需要的字节数
      const bytesNeeded = Math.ceil(Math.log2(max) / 8);
      const maxValid = Math.floor(256 ** bytesNeeded / max) * max;
      let randomValue;
      
      // 使用拒绝采样确保均匀分布
      do {
        const randomBytes = new Uint8Array(bytesNeeded);
        window.crypto.getRandomValues(randomBytes);
        randomValue = 0;
        for (let i = 0; i < bytesNeeded; i++) {
          randomValue = (randomValue << 8) | randomBytes[i];
        }
      } while (randomValue >= maxValid);
      
      return randomValue % max;
    } else {
      // 后备方案：使用基于时间戳的改进随机数
      const now = Date.now();
      const seed = now * 9301 + 49297; // 线性同余生成器参数
      return Math.floor((seed % 233280) / 233280 * max);
    }
  }

  /**
   * 检测设备是否支持 AV1 硬件解码
   * @returns {Promise<boolean>}
   */
  async function checkAV1Support() {
    // 检查 MediaCapabilities API 是否可用
    if (!('mediaCapabilities' in navigator)) {
      console.warn('MediaCapabilities API 不可用，假设不支持 AV1');
      return false;
    }

    try {
      // 检测 AV1 硬件解码支持
      const av1Config = {
        type: 'file',
        video: {
          contentType: 'video/webm; codecs="av01.0.08M.08"',
          width: 1920,
          height: 1080,
          bitrate: 2000000,
          framerate: 30
        }
      };

      const result = await navigator.mediaCapabilities.decodingInfo(av1Config);
      
      // 需要同时支持且能够硬件加速
      return result.supported && result.smooth && result.powerEfficient;
    } catch (error) {
      console.error('检测 AV1 支持时出错:', error);
      return false;
    }
  }

  /**
   * 获取流媒体清单
   * @returns {Promise<Object>}
   */
  async function fetchManifest() {
    // 检查缓存
    const now = Date.now();
    if (manifestCache && (now - cacheTimestamp) < CACHE_DURATION) {
      return manifestCache;
    }

    try {
      const response = await fetch(MANIFEST_URL, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
        mode: 'cors',
        credentials: 'omit'
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      // 更新缓存
      manifestCache = data;
      cacheTimestamp = now;
      
      return data;
    } catch (error) {
      console.error('获取媒体清单失败:', error);
      throw error;
    }
  }

  /**
   * 从清单中选择媒体文件
   * @param {Object} manifest - 清单数据
   * @param {boolean} supportsAV1 - 是否支持 AV1
   * @param {string|Object|null} originalName - 指定的原始文件名（可选）
   *   可以是字符串或对象 {av1: '文件名', hevc: '文件名'}
   * @param {string|null} theme - 主题筛选
   * @returns {Object|null} 选中的媒体文件信息
   */
  function selectMedia(manifest, supportsAV1, originalName = null, theme = null) {
    if (!manifest.streamingFormats || !manifest.streamingFormats.directories) {
      console.error('清单格式无效');
      return null;
    }

    // 如果指定了 originalName
    if (originalName) {
      let targetFileName = null;
      let preferredFormat = null;

      // 判断 originalName 的类型
      if (typeof originalName === 'string') {
        // 字符串：在所有目录中查找
        targetFileName = originalName;
      } else if (typeof originalName === 'object' && originalName !== null) {
        // 对象：根据设备支持情况选择合适的文件
        if (supportsAV1 && originalName.av1) {
          targetFileName = originalName.av1;
          preferredFormat = 'av1';
        } else if (originalName.hevc) {
          targetFileName = originalName.hevc;
          preferredFormat = 'hevc';
        }
      }

      if (targetFileName) {
        // 如果指定了格式，只在该格式目录中查找
        if (preferredFormat) {
          const directory = manifest.streamingFormats.directories.find(
            dir => dir.name === preferredFormat
          );
          
          if (directory && directory.files) {
            const targetFile = directory.files.find(
              file => file.originalName === targetFileName
            );
            
            if (targetFile) {
              console.log(`找到指定文件: ${targetFileName} in ${preferredFormat}`);
              return {
                directory: preferredFormat,
                file: targetFile
              };
            }
          }
        } else {
          // 在所有目录中查找
          for (const directory of manifest.streamingFormats.directories) {
            if (!directory.files) continue;
            
            const targetFile = directory.files.find(
              file => file.originalName === targetFileName
            );
            
            if (targetFile) {
              console.log(`找到指定文件: ${targetFileName} in ${directory.name}`);
              return {
                directory: directory.name,
                file: targetFile
              };
            }
          }
        }
        
        console.warn(`未找到指定的文件: ${targetFileName}，将返回随机文件`);
      }
    }

    // 根据支持情况选择目录
    const targetDir = supportsAV1 ? 'av1' : 'hevc';
    
    // 找到对应的目录
    const directory = manifest.streamingFormats.directories.find(
      dir => dir.name === targetDir
    );

    if (!directory || !directory.files || directory.files.length === 0) {
      console.error(`未找到 ${targetDir} 媒体文件`);
      return null;
    }

    // 智能随机选择，避免重复
    let availableFiles = directory.files;
    
    // 如果指定了主题，先按主题筛选
    if (theme && manifest.wallpaperInfo) {
      availableFiles = availableFiles.filter(file => {
        const wallpaperInfo = manifest.wallpaperInfo.find(info => 
          info.files && info.files.includes(file.originalName)
        );
        
        if (!wallpaperInfo) return false;
        
        // 根据主题筛选：
        // - 如果壁纸主题是 'both'，总是包含
        // - 如果壁纸主题与请求主题匹配，包含
        return wallpaperInfo.theme === 'both' || wallpaperInfo.theme === theme;
      });
      
      if (availableFiles.length === 0) {
        console.warn(`没有找到主题为 '${theme}' 的媒体文件，将使用所有文件`);
        availableFiles = directory.files;
      }
    }
    
    // 如果有最近选择记录，过滤掉最近选择过的文件
    if (recentSelections[targetDir].length > 0 && availableFiles.length > RECENT_HISTORY_SIZE) {
      const filteredFiles = availableFiles.filter(file => 
        !recentSelections[targetDir].includes(file.uuid)
      );
      
      // 如果过滤后还有可用文件，使用过滤后的列表
      if (filteredFiles.length > 0) {
        availableFiles = filteredFiles;
      } else {
        // 清空历史记录
        recentSelections[targetDir] = [];
      }
    }
    
    // 随机选择一个文件
    const randomIndex = getSecureRandomInt(availableFiles.length);
    const selectedFile = availableFiles[randomIndex];
    
    // 更新最近选择记录
    recentSelections[targetDir].push(selectedFile.uuid);
    if (recentSelections[targetDir].length > RECENT_HISTORY_SIZE) {
      recentSelections[targetDir].shift(); // 移除最旧的记录
    }

    return {
      directory: targetDir,
      file: selectedFile
    };
  }

  /**
   * 构建媒体 URL
   * @param {Object} mediaInfo - 媒体信息
   * @param {string} type - 请求的类型 ('media', 'dash', 'hls')
   * @returns {string} 完整的 URL
   */
  function buildMediaUrl(mediaInfo, type) {
    const { directory, file } = mediaInfo;
    const { uuid, name, formats } = file;

    switch (type) {
      case 'media':
        // 返回原始媒体文件 URL
        return `${BASE_URL}/${directory}/${name}`;

      case 'hls':
        // 返回 HLS 播放列表 URL
        if (!formats.hls) {
          throw new Error('该文件不支持 HLS 格式');
        }
        return `${BASE_URL}/streams/${uuid}/${formats.hls.path}`;

      case 'dash':
        // 返回 DASH 清单 URL
        if (!formats.dash) {
          throw new Error('该文件不支持 DASH 格式');
        }
        return `${BASE_URL}/streams/${uuid}/${formats.dash.path}`;

      default:
        throw new Error(`不支持的类型: ${type}`);
    }
  }

  /**
   * 主函数 - 获取媒体 URL
   * @param {string} type - 请求的类型 ('media', 'dash', 'hls')
   * @param {string|Object|null} originalName - 指定的原始文件名（可选）
   *   可以是字符串或对象 {av1: '文件名', hevc: '文件名'}
   * @param {string|null} theme - 主题筛选 ('light', 'dark', 'both', null)
   * @returns {Promise<Object>} 包含 URL 和元数据的对象
   */
  window.getMediaPaper = async function(type = 'media', originalName = null, theme = null) {
    try {
      // 参数验证
      const validTypes = ['media', 'dash', 'hls'];
      if (!validTypes.includes(type)) {
        throw new Error(`无效的类型参数: ${type}. 必须是 ${validTypes.join(', ')} 之一`);
      }

      // 并行执行：检测 AV1 支持和获取清单
      const [supportsAV1, manifest] = await Promise.all([
        checkAV1Support(),
        fetchManifest()
      ]);

      console.log(`设备 ${supportsAV1 ? '支持' : '不支持'} AV1 硬件解码`);

      // 参数验证 - 主题
      const validThemes = ['light', 'dark', 'both', null];
      if (theme !== null && !validThemes.includes(theme)) {
        throw new Error(`无效的主题参数: ${theme}. 必须是 'light', 'dark', 'both' 或 null`);
      }

      // 选择媒体文件
      const selectedMedia = selectMedia(manifest, supportsAV1, originalName, theme);
      if (!selectedMedia) {
        throw new Error('无法选择媒体文件');
      }

      // 构建 URL
      const url = buildMediaUrl(selectedMedia, type);

      // 查找壁纸信息
      let wallpaperInfo = null;
      if (manifest.wallpaperInfo) {
        wallpaperInfo = manifest.wallpaperInfo.find(info => 
          info.files && info.files.includes(selectedMedia.file.originalName)
        );
      }

      // 返回结果
      return {
        url: url,
        metadata: {
          uuid: selectedMedia.file.uuid,
          originalName: selectedMedia.file.originalName,
          name: selectedMedia.file.name,
          format: selectedMedia.directory,
          codec: selectedMedia.directory === 'av1' ? 'av1' : 'hevc',
          type: type,
          supportsAV1: supportsAV1,
          formats: selectedMedia.file.formats,
          isSpecified: originalName !== null,
          requestedTheme: theme,
          wallpaperInfo: wallpaperInfo ? {
            name: wallpaperInfo.name,
            url: wallpaperInfo.url,
            theme: wallpaperInfo.theme
          } : null
        }
      };

    } catch (error) {
      console.error('getMediaPaper 错误:', error);
      throw error;
    }
  };

  // 导出一些实用函数供调试使用
  window.MediaBrowser = {
    checkAV1Support,
    fetchManifest,
    clearCache: () => {
      manifestCache = null;
      cacheTimestamp = 0;
      console.log('清单缓存已清除');
    },
    clearRecentHistory: () => {
      recentSelections = { av1: [], hevc: [] };
      console.log('最近选择历史已清除');
    },
    getRecentHistory: () => recentSelections,
    getBaseUrl: () => BASE_URL,
    // 获取所有可用的媒体文件列表
    getAvailableMedia: async () => {
      try {
        const manifest = await fetchManifest();
        if (!manifest.streamingFormats || !manifest.streamingFormats.directories) {
          return [];
        }
        
        const mediaList = [];
        for (const directory of manifest.streamingFormats.directories) {
          if (!directory.files) continue;
          
          directory.files.forEach(file => {
            // 查找壁纸信息
            let wallpaperInfo = null;
            if (manifest.wallpaperInfo) {
              wallpaperInfo = manifest.wallpaperInfo.find(info => 
                info.files && info.files.includes(file.originalName)
              );
            }
            
            mediaList.push({
              originalName: file.originalName,
              format: directory.name,
              uuid: file.uuid,
              hasHLS: !!file.formats.hls,
              hasDASH: !!file.formats.dash,
              wallpaperInfo: wallpaperInfo ? {
                name: wallpaperInfo.name,
                url: wallpaperInfo.url,
                theme: wallpaperInfo.theme
              } : null
            });
          });
        }
        
        return mediaList;
      } catch (error) {
        console.error('获取媒体列表失败:', error);
        return [];
      }
    }
  };

  // 初始化日志
  console.log('Media Browser API 已加载');
  console.log('使用方法: await getMediaPaper(type, originalName?, theme?)');
  console.log('  type: "media" | "dash" | "hls"');
  console.log('  originalName: 可选参数');
  console.log('    - 字符串: 在所有格式中查找该文件名');
  console.log('    - 对象: {av1: "文件名", hevc: "文件名"} 根据设备能力选择');
  console.log('  theme: 可选参数 - "light" | "dark" | "both" | null');
  console.log('    - light: 只选择亮色主题壁纸');
  console.log('    - dark: 只选择暗色主题壁纸');
  console.log('    - both/null: 不限制主题');

})();
