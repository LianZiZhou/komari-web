import React, { useEffect, useState } from 'react';
import FOG from 'vanta/dist/vanta.fog.min.js';
import { LiveDataProvider } from "@/contexts/LiveDataContext";
import Footer from "../components/Footer";
import NavBar from "../components/NavBar";
import { Outlet } from "react-router-dom";
import { NodeListProvider } from "@/contexts/NodeListContext";
import { ThemeContext } from "@/contexts/ThemeContext";

interface BackgroundProps extends React.PropsWithChildren {
  theme?: 'light' | 'dark';
}

//@ts-expect-error ignore
class Background extends React.Component<BackgroundProps> {
  vantaRef: React.RefObject<HTMLDivElement | null>;
  vanta: any;
  constructor(props: BackgroundProps) {
    super(props);
    this.vantaRef = React.createRef();
    this.handleResize = this.handleResize.bind(this);
  }
  
  handleResize() {
    if (this.vanta) {
      this.vanta.resize();
    }
  }
  
  updateColors() {
    if (!this.vanta) return;
    
    const isDark = this.props.theme === 'dark';

    // 根据主题调整配色
    const colors = !isDark ? {
      highlightColor: 0xCAC7E8,
      midtoneColor: 0xBBB7ED,
      lowlightColor: 0xE4E3EF,
      baseColor: 0xE4E3EF,
      blurFactor: 0.40,
      zoom: 1.50
    } : {
      highlightColor: 0x797979,
      midtoneColor: 0xFFFFFF,
      lowlightColor: 0x5C5C5C,
      baseColor: 0x5C5C5C,
      blurFactor: 0.53,
      zoom: 1.50
    };
    
    this.vanta.setOptions(colors);
  }
  
  componentDidMount() {
    const reduce = 0.4;
    const dpr = window.devicePixelRatio || 1;
    this.vanta = FOG({
      el: this.vantaRef.current,
      minHeight: window.innerHeight * dpr * reduce,  // 考虑设备像素比的实际高度
      minWidth: window.innerWidth * dpr * reduce,     // 考虑设备像素比的实际宽度
      scale: 1.0 / dpr / reduce,  // 正确的缩放比例：1除以设备像素比
      scaleMobile: 1.0 / dpr / reduce,  // 移动端也使用相同的计算方式
    });
    
    this.updateColors();
    
    // 监听窗口大小变化
    window.addEventListener('resize', this.handleResize);
  }
  
  componentDidUpdate(prevProps: BackgroundProps) {
    if (prevProps.theme !== this.props.theme) {
      this.updateColors();
    }
  }
  
  componentWillUnmount() {
    window.removeEventListener('resize', this.handleResize);
    if (this.vanta) {
      this.vanta.destroy();
    }
  }
  render() {
    return (
      <div 
        ref={this.vantaRef} 
        style={{ 
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          zIndex: -1,
          backgroundColor: this.props.theme === 'dark' ? '#1E1B4B' : '#F5F3FF'  // 设置背景色防止闪烁
        }}
      />
    );
  }
}

import { TablerLock, TablerLockOpen } from '../components/Icones/Tabler';

function BackgroundPaper({ actualTheme }: { actualTheme: 'light' | 'dark' }) {
  const [mediaPaper, setMediaPaper] = useState<{
    url: string, 
    metadata: {
      name: string,
      originalName: string,
      wallpaperInfo: {
        name: string, 
        url: string, 
        theme: 'light' | 'dark' | 'both'
      }
    }
  } | null>(null);
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);
  const [mediaWallpaperInfo, setMediaWallpaperInfo] = useState<{name: string, url: string, theme: 'light' | 'dark' | 'both'} | null>(null);
  const [isLocked, setIsLocked] = useState(false);
  
  // 获取锁定的壁纸信息
  const getLockedWallpaper = (theme: 'light' | 'dark') => {
    const key = `lockedWallpaper_${theme}`;
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : null;
  };
  
  // 设置锁定的壁纸信息
  const setLockedWallpaper = (theme: 'light' | 'dark', wallpaperInfo: {originalName: string} | null) => {
    const key = `lockedWallpaper_${theme}`;
    if (wallpaperInfo) {
      localStorage.setItem(key, JSON.stringify(wallpaperInfo));
    } else {
      localStorage.removeItem(key);
    }
  };
  
  // 检查当前壁纸是否被锁定
  const checkIsLocked = () => {
    const locked = getLockedWallpaper(actualTheme);
    return locked && mediaPaper && locked.originalName === mediaPaper.metadata.originalName;
  };
  
  // 切换锁定状态
  const toggleLock = () => {
    if (isLocked) {
      setLockedWallpaper(actualTheme, null);
      setIsLocked(false);
    } else if (mediaPaper) {
      setLockedWallpaper(actualTheme, { originalName: mediaPaper.metadata.originalName });
      setIsLocked(true);
    }
  };

  function fetchMediaPaper() {
    // 检查是否有锁定的壁纸
    const lockedWallpaper = getLockedWallpaper(actualTheme);
    const originalName = lockedWallpaper?.originalName || null;
    
    //@ts-ignore
    window.getMediaPaper('media', originalName, actualTheme).then((mediaUrl) => {
      console.log(mediaUrl)
      setMediaPaper(mediaUrl);
      setMediaUrl(mediaUrl.url);
      if(mediaUrl.metadata.wallpaperInfo) {
        setMediaWallpaperInfo(mediaUrl.metadata.wallpaperInfo);
      }
    });
  }

  if(mediaWallpaperInfo && mediaWallpaperInfo.theme !== 'both' && mediaWallpaperInfo.theme !== actualTheme) {
    fetchMediaPaper();
  }
  
  useEffect(() => {
    fetchMediaPaper();
  }, [actualTheme]);
  
  // 当 mediaPaper 或 actualTheme 变化时，更新锁定状态
  useEffect(() => {
    setIsLocked(checkIsLocked());
  }, [mediaPaper, actualTheme]);

  return <>
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: -1,
      }}
      className='bg-transparent'
    >
      {
        mediaUrl && <video 
          src={mediaUrl} 
          autoPlay 
          muted 
          loop
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover'
          }}
        />
      }
    </div>
    {
      mediaWallpaperInfo && 
      <div style={{
        position: 'fixed',
        bottom: 20,
        right: 20,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        borderRadius: '8px',
        padding: '12px 16px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        backdropFilter: 'blur(10px)',
        zIndex: 1000,
        color: 'white',
        fontSize: '14px',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
      }}>
        <img 
          src={
            !isLocked ? '/assets/wallpaper_engine.webp' : '/assets/wallpaper_engine_static.png'
          }
          alt="Wallpaper Engine" 
          onClick={() => {
            fetchMediaPaper();
          }}
          style={{
            width: '32px',
            height: '32px',
            objectFit: 'contain',
            borderRadius: '4px',
            cursor: !isLocked ? 'pointer' : 'default',
          }}
        />
        <button
          onClick={toggleLock}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: 'white',
            padding: '4px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '4px',
            transition: 'background-color 0.2s',
          }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          title={isLocked ? '解锁当前壁纸' : '锁定当前壁纸'}
        >
          {isLocked ? (
            <TablerLock style={{ width: '20px', height: '20px' }} />
          ) : (
            <TablerLockOpen style={{ width: '20px', height: '20px' }} />
          )}
        </button>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '4px'
        }}>
          <div style={{ fontWeight: 'bold' }}>
            {mediaWallpaperInfo.name}
          </div>
          {mediaWallpaperInfo.url && (() => {
            const match = mediaWallpaperInfo.url.match(/id=(\d+)/);
            const workshopId = match ? match[1] : null;
            return workshopId ? (
              <a 
                href={mediaWallpaperInfo.url}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  color: '#1a9fff',
                  textDecoration: 'none',
                  fontSize: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
                onMouseEnter={(e) => e.currentTarget.style.textDecoration = 'underline'}
                onMouseLeave={(e) => e.currentTarget.style.textDecoration = 'none'}
              >
                Workshop: {workshopId}
              </a>
            ) : null;
          })()}
        </div>
      </div>
    }
  </>
}

const IndexLayout = () => {
  const InnerLayout = () => {
    const { appearance } = React.useContext(ThemeContext);
    
    // 获取实际的主题（考虑系统主题）
    const getActualTheme = () => {
      if (appearance === 'system') {
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      }
      return appearance as 'light' | 'dark';
    };
    
    //@ts-ignore
    const [actualTheme, setActualTheme] = React.useState<'light' | 'dark'>(getActualTheme());
    
    React.useEffect(() => {
      const updateTheme = () => {
        setActualTheme(getActualTheme());
      };
      
      updateTheme();
      
      // 监听系统主题变化
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      mediaQuery.addEventListener('change', updateTheme);
      
      return () => {
        mediaQuery.removeEventListener('change', updateTheme);
      };
    }, [appearance]);
    
    return (
      <>
        <BackgroundPaper actualTheme={actualTheme} />
        <div className="layout flex flex-col w-full h-screen overflow-auto">
          <NavBar />
          <main className="main-content m-1">
            <Outlet />
          </main>
          <Footer />
        </div>
      </>
    );
  };

  return (
    <LiveDataProvider>
      <NodeListProvider>
        <InnerLayout />
      </NodeListProvider>
    </LiveDataProvider>
  );
};

export default IndexLayout;
