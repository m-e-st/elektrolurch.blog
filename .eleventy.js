const { DateTime } = require('luxon');
const readingTime = require('eleventy-plugin-reading-time');
const pluginRss = require('@11ty/eleventy-plugin-rss');
const syntaxHighlight = require('@11ty/eleventy-plugin-syntaxhighlight');
const htmlmin = require('html-minifier-terser')
const fs = require('fs');
const path = require('path');

const isDev = process.env.ELEVENTY_ENV === 'development';
const isProd = process.env.ELEVENTY_ENV === 'production'

const manifestPath = path.resolve(
  __dirname,
  'public',
  'assets',
  'manifest.json'
);

const manifest = isDev
  ? {
      'main.js': '/assets/main.js',
      'main.css': '/assets/main.css',
    }
  : JSON.parse(fs.readFileSync(manifestPath, { encoding: 'utf8' }));


function obfuscateMail(mailAddress) {
	if (typeof mailAddress === undefined) return '';
	const btoa = function(str){ return Buffer.from(str).toString('base64'); }
	//~ let binMail = btoa('mailto:' + mailAddress);
	//~ let ascMail = mailAddress.replace(/[\u0000-\u9999<>\&]/g, function(c) {return '&#'+c.charCodeAt(0)+';';});
	let binMail = btoa('mailto:' + mailAddress);
	let ascMail = mailAddress;
	return '<a href="javascript:alert(\'atob(' + binMail + ')\');">' + ascMail + '</a>';
}

module.exports = function (eleventyConfig) {
  eleventyConfig.addPlugin(readingTime);
  eleventyConfig.addPlugin(pluginRss);
  eleventyConfig.addPlugin(syntaxHighlight);

  // setup mermaid markdown highlighter
  const highlighter = eleventyConfig.markdownHighlighter;
  eleventyConfig.addMarkdownHighlighter((str, language) => {
    if (language === 'mermaid') {
      return `<pre class="mermaid">${str}</pre>`;
    }
    return highlighter(str, language);
  });

  eleventyConfig.setDataDeepMerge(true);
  eleventyConfig.addPassthroughCopy({ 'src/images': 'images' });
  eleventyConfig.setBrowserSyncConfig({ files: [manifestPath] });

  eleventyConfig.addShortcode('bundledcss', function () {
    return manifest['main.css']
      ? `<link href="${manifest['main.css']}" rel="stylesheet" />`
      : '';
  });

  eleventyConfig.addShortcode('bundledjs', function () {
    return manifest['main.js']
      ? `<script src="${manifest['main.js']}"></script>`
      : '';
  });

	/*** Ausschneiden der ersten 200 Zeichen eines Posts oder 1. Paragraph ***/
	eleventyConfig.addFilter('excerpt', (post, excerptlength=200) => {
		const paralen = post.indexOf('</p>');
		if ((paralen > 0) && (paralen < excerptlength)) return post.slice(0, paralen).replace(/(<([^>]+)>)/gi, '');
		const content = post.replace(/(<([^>]+)>)/gi, '');
		return content.substr(0, content.lastIndexOf(' ', excerptlength)) + ' ...';
	});

	/*** mittleres Datumsformat ***/
	eleventyConfig.addFilter('readableDate', (dateObj, language='en') => {
		return DateTime.fromJSDate(dateObj, { zone: 'utc', locale:language }).toFormat('dd LLL yyyy');
	});

	/*** kurzes Datumsformat ***/
	eleventyConfig.addFilter('htmlDateString', (dateObj, language='en') => {
		return DateTime.fromJSDate(dateObj, { zone: 'utc', locale:language }).toFormat('yyyy-LL-dd');
	});

	eleventyConfig.addFilter('dateToIso', (dateString) => {
		return new Date(dateString).toISOString()
	});

  eleventyConfig.addFilter('head', (array, n) => {
    if (n < 0) {
      return array.slice(n);
    }

    return array.slice(0, n);
  });
  
  eleventyConfig.addCollection('tagList', function (collection) {
    let tagSet = new Set();
    collection.getAll().forEach(function (item) {
      if ('tags' in item.data) {
        let tags = item.data.tags;

        tags = tags.filter(function (item) {
          switch (item) {
            case 'all':
            case 'nav':
            case 'post':
            case 'posts':
            case 'memes':
              return false;
          }

          return true;
        });

        for (const tag of tags) {
          tagSet.add(tag);
        }
      }
    });

    return [...tagSet];
  });

  eleventyConfig.addCollection('memeTags', function (collection) {
    let tagSet = new Set();
			//~ console.log("Meme", collection);
    collection.getAll().forEach(function (item) {
      if ('tags' in item.data) {
        let tags = item.data.tags;
        tags = tags.filter(function (item) {
          switch (item) {
            case 'all':
            case 'nav':
            case 'post':
            case 'posts':
            case 'memes':
              return false;
          }

          return true;
        });

        for (const tag of tags) {
			//~ console.log("Tag", tag);
          //~ tagSet.add(tag);
        }
      }
    });

    return [...tagSet];
  });

  eleventyConfig.addFilter('pageTags', (tags) => {
    const generalTags = ['all', 'nav', 'post', 'posts', "memes"];

    return tags
      .toString()
      .split(',')
      .filter((tag) => {
        return !generalTags.includes(tag);
      });
  });

  eleventyConfig.addTransform('htmlmin', function(content, outputPath) {
    if ( outputPath && outputPath.endsWith(".html") && isProd) {
      return htmlmin.minify(content, {
        removeComments: true,
        collapseWhitespace: true,
        useShortDoctype: true,
      });
    }

    return content;
  });

  return {
    dir: {
      input: 'src',
      output: 'public',
      includes: 'includes',
      data: 'data',
      layouts: 'layouts'
    },
    passthroughFileCopy: true,
    templateFormats: ['html', 'njk', 'md'],
    htmlTemplateEngine: 'njk',
    markdownTemplateEngine: 'njk',
  };
};
