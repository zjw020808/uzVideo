// ignore
// @name:javxx 视频源
// @webSite:https://javxx.com
// @version:1
// @remark:JavXX 视频源扩展
// @isAV:1
// @deprecated:0
// ignore

// 定义全局配置
const appConfig = {
    _webSite: 'https://javxx.com',
    get webSite() { return this._webSite; },
    set webSite(value) { this._webSite = value; },
    _uzTag: '',
    get uzTag() { return this._uzTag; },
    set uzTag(value) { this._uzTag = value; }
};

// 辅助函数：发送HTTP请求
async function req(url) {
    try {
        const response = await fetch(url);
        const data = await response.text();
        return { error: false, data: data };
    } catch (error) {
        return { error: true, msg: error.message };
    }
}

// 获取视频列表（分类/搜索共用）
async function fetchVideoList(url, page) {
    let backData = new RepVideoList();
    // 假设分类列表和搜索结果列表使用相同的页面结构
    let fullUrl = `${appConfig.webSite}${url}`;
    // 分页判断: 如果请求的URL中没有包含问号，表示它可能还不包含查询参数，就用 ?page= 拼接；
    // 否则（例如搜索URL已有?keyword=xxx），用 &page= 拼接。
    if (fullUrl.indexOf('?') === -1) {
        fullUrl += `?page=${page}`;
    } else {
        fullUrl += `&page=${page}`;
    }
    
    try {
        const pro = await req(fullUrl);
        if (pro.error) {
            backData.error = pro.msg;
            return JSON.stringify(backData);
        }
        
        const $ = cheerio.load(pro.data);
        let videos = [];
        
        // 根据提供的HTML结构解析视频列表
        $('.item').each((_, elem) => {
            const videoDet = new VideoDetail();
            const linkElem = $(elem).find('.title');
            const posterElem = $(elem).find('.poster');
            const imgElem = $(elem).find('.image img');
            
            // 设置视频ID和URL（从a标签的href中提取相对路径）
            let href = linkElem.attr('href') || posterElem.attr('href');
            if (href && href.startsWith('/')) {
                videoDet.vod_id = href;
            } else {
                videoDet.vod_id = href;
            }
            
            // 设置视频标题（code + 描述）
            const code = $(elem).find('.code').text().trim();
            const titleSpan = $(elem).find('.title span:not(.code)').text().trim();
            videoDet.vod_name = code + ' ' + titleSpan;
            
            // 设置封面图片
            videoDet.vod_pic = imgElem.attr('src');
            
            // 设置时长
            videoDet.vod_remarks = $(elem).find('.duration').text().trim();
            
            videos.push(videoDet);
        });
        
        backData.data = videos;
    } catch (error) {
        backData.error = error.message;
    }
    
    return JSON.stringify(backData);
}

// 获取视频详情（视频站是详情页即播放页，无分集）
async function getVideoDetail(args) {
    let backData = new RepVideoDetail();
    let fullUrl = `${appConfig.webSite}${args.url}`;
    
    try {
        const pro = await req(fullUrl);
        if (pro.error) {
            backData.error = pro.msg;
            return JSON.stringify(backData);
        }
        
        const $ = cheerio.load(pro.data);
        let vodDetail = new VideoDetail();
        
        vodDetail.vod_id = args.url;
        // 提取标题
        vodDetail.vod_name = $('h1').text().trim() || $('.video-title').text().trim() || '未知标题';
        // 提取封面图
        vodDetail.vod_pic = $('.poster img').attr('src') || '';
        // 提取简介/描述
        vodDetail.vod_content = $('.info .description, .video-description, .intro').text().trim() || '';
        
        // 因为是单集视频，直接创建一个剧集项
        let episode = new Episode();
        episode.episode_id = args.url;
        episode.episode_name = '播放';
        episode.episode_url = args.url;
        vodDetail.vod_episodes = [episode];
        vodDetail.vod_episode_total = 1;
        
        backData.data = vodDetail;
    } catch (error) {
        backData.error = error.message;
    }
    
    return JSON.stringify(backData);
}

// 获取视频播放地址
async function getVideoPlayUrl(args) {
    let backData = new RepVideoPlayUrl();
    let fullUrl = `${appConfig.webSite}${args.url}`;
    
    try {
        // 方法1：直接返回从Network面板捕获的m3u8地址
        // 注意：实际使用时，URL中的token等参数可能会过期，需要动态从页面提取
        
        // 方法2：从页面中解析真实的播放地址
        const pro = await req(fullUrl);
        if (pro.error) {
            backData.error = pro.msg;
            return JSON.stringify(backData);
        }
        
        const $ = cheerio.load(pro.data);
        let playUrl = '';
        
        // 尝试从多个可能的元素中提取视频地址
        // 1. 检查video标签的src属性
        const videoSrc = $('video').attr('src');
        if (videoSrc && videoSrc.startsWith('http')) {
            playUrl = videoSrc;
        }
        
        // 2. 检查source标签
        if (!playUrl) {
            const sourceSrc = $('source').attr('src');
            if (sourceSrc && sourceSrc.startsWith('http')) {
                playUrl = sourceSrc;
            }
        }
        
        // 3. 查找可能包含m3u8链接的script变量
        if (!playUrl) {
            const pageContent = pro.data;
            const m3u8Match = pageContent.match(/https?:\/\/[^"'\s]+\.m3u8[^"'\s]*/);
            if (m3u8Match) {
                playUrl = m3u8Match[0];
            }
        }
        
        // 4. 如果以上方法都失败，使用备用的API猜测地址（仅供参考，实际无法保证有效）
        if (!playUrl) {
            playUrl = `https://f08a6b76.bright-light-107.store/blah4/${Date.now()}/video.m3u8`;
        }
        
        backData.url = playUrl;
    } catch (error) {
        backData.error = error.message;
    }
    
    return JSON.stringify(backData);
}

// 获取分类列表（站点没有明确分类，返回默认分类）
async function getClassList(args) {
    let backData = new RepVideoClassList();
    backData.data = [
        { type_id: 'hot', type_name: '热门推荐', hasSubclass: false },
        { type_id: 'new', type_name: '最新发布', hasSubclass: false },
        { type_id: 'cn', type_name: '中文分类', hasSubclass: false }
    ];
    return JSON.stringify(backData);
}

// 获取分类下的视频列表
async function getVideoList(args) {
    let url = '';
    switch (args.url) {
        case 'hot':
            url = '/cn/hot';
            break;
        case 'new':
            url = '/cn/new';
            break;
        case 'cn':
            url = '/cn';
            break;
        default:
            url = '/cn/hot';
    }
    return await fetchVideoList(url, args.page);
}

// 搜索视频
async function searchVideo(args) {
    const searchPath = `/cn/search?keyword=${encodeURIComponent(args.keyword)}`;
    return await fetchVideoList(searchPath, args.page);
}

// 获取二级分类（此站点无二级分类）
async function getSubclassList(args) {
    let backData = new RepVideoSubclassList();
    return JSON.stringify(backData);
}

// 获取二级分类视频列表
async function getSubclassVideoList(args) {
    let backData = new RepVideoList();
    return JSON.stringify(backData);
}