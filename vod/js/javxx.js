// ignore
//@name:javxx 视频源
//@version:3
//@webSite:https://javxx.com
//@remark:移除 @instance，解决变量名不匹配问题
//@type:100
//@isAV:1
// ignore

import {} from '../../core/uzVideo.js'
import {} from '../../core/uzHome.js'
import {} from '../../core/uz3lib.js'
import {} from '../../core/uzUtils.js'

class javxxClass extends WebApiBase {
    constructor() {
        super();
        this.webSite = 'https://javxx.com';
        this.headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept-Language': 'zh-CN,zh;q=0.9',
        };
    }

    async getClassList(args) {
        let backData = new RepVideoClassList();
        backData.data = [
            { type_id: '/cn/hot', type_name: '热门推荐', hasSubclass: false },
            { type_id: '/cn', type_name: '最新发布', hasSubclass: false }
        ];
        return JSON.stringify(backData);
    }

    async getVideoList(args) {
        let url = args.url;
        let page = args.page || 1;
        let fullUrl = this.webSite + url + (url.includes('?') ? `&page=${page}` : `?page=${page}`);
        return await this._fetchVideoList(fullUrl);
    }

    async searchVideo(args) {
        let keyword = encodeURIComponent(args.searchWord);
        let page = args.page || 1;
        let searchUrl = `${this.webSite}/cn/search?keyword=${keyword}&page=${page}`;
        return await this._fetchVideoList(searchUrl);
    }

    async _fetchVideoList(fullUrl) {
        let backData = new RepVideoList();
        try {
            const pro = await req(fullUrl, { headers: this.headers });
            if (pro.error) {
                backData.error = pro.error;
                return JSON.stringify(backData);
            }
            const $ = cheerio.load(pro.data);
            let videos = [];
            $('.item').each((_, elem) => {
                let videoDet = new VideoDetail();
                let linkElem = $(elem).find('.title');
                let href = linkElem.attr('href') || $(elem).find('.poster').attr('href');
                if (href && href.startsWith('/')) {
                    videoDet.vod_id = href;
                } else {
                    videoDet.vod_id = href;
                }
                let code = $(elem).find('.code').text().trim();
                let titleSpan = $(elem).find('.title span:not(.code)').text().trim();
                videoDet.vod_name = code + ' ' + titleSpan;
                videoDet.vod_pic = $(elem).find('.image img').attr('src');
                videoDet.vod_remarks = $(elem).find('.duration').text().trim();
                videos.push(videoDet);
            });
            backData.data = videos;
        } catch (err) {
            backData.error = err.message;
        }
        return JSON.stringify(backData);
    }

    async getVideoDetail(args) {
        let backData = new RepVideoDetail();
        let fullUrl = this.webSite + args.url;
        try {
            const pro = await req(fullUrl, { headers: this.headers });
            if (pro.error) {
                backData.error = pro.error;
                return JSON.stringify(backData);
            }
            const $ = cheerio.load(pro.data);
            let vodDetail = new VideoDetail();
            vodDetail.vod_id = args.url;
            vodDetail.vod_name = $('h1').text().trim() || $('.video-title').text().trim() || '未知标题';
            vodDetail.vod_pic = $('.poster img').attr('src') || '';
            vodDetail.vod_content = $('.info .description, .video-description, .intro').text().trim() || '';
            vodDetail.vod_play_url = `播放$${fullUrl}`;
            backData.data = vodDetail;
        } catch (err) {
            backData.error = err.message;
        }
        return JSON.stringify(backData);
    }

    async getVideoPlayUrl(args) {
        let backData = new RepVideoPlayUrl();
        let pageUrl = args.url;
        try {
            const pro = await req(pageUrl, { headers: this.headers });
            if (pro.error) {
                backData.error = pro.error;
                return JSON.stringify(backData);
            }
            let html = pro.data;
            let m3u8Match = html.match(/https?:\/\/[^"'\s]+\.m3u8[^"'\s]*/);
            if (m3u8Match && m3u8Match[0]) {
                backData.data = m3u8Match[0];
            } else {
                const $ = cheerio.load(html);
                let videoSrc = $('video').attr('src');
                if (videoSrc && videoSrc.startsWith('http')) {
                    backData.data = videoSrc;
                } else {
                    let sourceSrc = $('source').attr('src');
                    if (sourceSrc && sourceSrc.startsWith('http')) {
                        backData.data = sourceSrc;
                    } else {
                        backData.error = '未找到播放地址';
                    }
                }
            }
        } catch (err) {
            backData.error = err.message;
        }
        return JSON.stringify(backData);
    }

    async getSubclassList(args) {
        return JSON.stringify(new RepVideoSubclassList());
    }
    async getSubclassVideoList(args) {
        return JSON.stringify(new RepVideoList());
    }
}

// 直接创建实例，不定义具体变量名（框架会自动捕获）
new javxxClass();
