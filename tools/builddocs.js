var fs = require('fs'),
	path = require('path'),
	marked = require('marked'),
	xtpl = require('xtpl');

//markdown定制
var markedRenderer = new marked.Renderer();

var srcDirPath = '',
	projectPath = '';

markedRenderer.heading = function(text, level){
	return '<h' + level + '>' + text + '</h' + level + '>';
};

marked.setOptions({
  highlight: function (code) {
    return require('highlight.js').highlightAuto(code).value;
  },
  renderer : markedRenderer
});

module.exports.buildGuide = function(srcUrl){
	srcDirPath = path.resolve(srcUrl);
	projectPath = path.resolve(srcUrl, '../../5.0');

	var	guidesPath = path.resolve(srcDirPath, './guides'),
		guidesModuleLists = [];
	fs.readdirSync(guidesPath).forEach(function(dir){
		var dirName = path.resolve(guidesPath,dir),
			src = path.normalize(path.relative(projectPath, dirName).replace('src','/5.0'));
		guidesModuleLists.push({
			name : dir,
			src : src
		});
		if(fs.statSync(dirName).isDirectory()){
			var sideBarHtml = getSideBarHtmlSync(dirName);
			//将markdown转为html
			fs.readdirSync(dirName).forEach(function(file){
				var fileName = path.resolve(dirName,file),
					fileMD = fs.readFileSync(fileName).toString(),
					fileHtml = marked(fileMD),
					apiLinkReg = /\(\(\(apilink=(.+)\)\)\)/,
					apiLinkRegResult = apiLinkReg.exec(fileHtml),
					apilink = '/5.0/api';

				if(apiLinkRegResult){
					apilink = apiLinkRegResult[1];
					fileHtml = fileHtml.replace(apiLinkRegResult[0],'');
				}

				var mainXtplPath = path.resolve(srcDirPath,'../themes/guides/layouts/main.xtpl'),
					desFile = xtpl.__express(mainXtplPath,{
						mainContent : fileHtml,
						sidebarContent : sideBarHtml,
						apilink : apilink,
						settings : {
							'view encoding' : 'utf-8'
						}
					},function(err,desFile){
						if(err){
							console.log('render error!');
						}else{
							var desFileName = path.normalize(fileName.replace('src','').replace('md','html'));
							!fs.existsSync(path.dirname(desFileName)) && fs.mkdirSync(path.dirname(desFileName));
							fs.writeFileSync(desFileName, desFile);
						}
					});
			});
		}
	});
	buildGuideIndex(guidesModuleLists);
};


module.exports.buildDemos = function(srcUrl){
	srcDirPath = path.resolve(srcUrl);
	projectPath = path.resolve(srcUrl, '../../5.0');

	var	demosPath = path.resolve(srcDirPath, './demos'),
		demoLists = [];
	fs.readdirSync(demosPath).forEach(function(dir){
		var dirName = path.resolve(demosPath,dir),
			src = path.normalize(path.relative(projectPath, dirName).replace('src','/5.0'));
		demoLists.push({
			name : dir,
			src : src
		});
		if(fs.statSync(dirName).isDirectory()){
			var sideBarHtml = getSideBarHtmlSync(dirName);

			fs.readdirSync(dirName).forEach(function(file){

				var fileName = path.resolve(dirName,file),
					mainXtplPath = path.resolve(srcDirPath,'../themes/demos/layouts/main.xtpl'),
					demoCodeXtplPath = path.resolve(srcDirPath,'../themes/demos/layouts/demo-code.xtpl');
				if(fs.statSync(fileName).isDirectory()){
					return;
				}
				var fileMD = fs.readFileSync(fileName).toString(),
					fileHtml = marked(fileMD),
					apiLinkReg = /\(\(\(apilink=(.+)\)\)\)/,
					apiLinkRegResult = apiLinkReg.exec(fileHtml),
					apilink = '/5.0/api',
					fileReg = /{{{(.+?)}}}/g,
					includingFiles = fileHtml.match(fileReg);
				if(apiLinkRegResult){
					apilink = apiLinkRegResult[1];
					fileHtml = fileHtml.replace(apiLinkRegResult[0],'');
				}
					
				for(var i = 0; i < includingFiles.length; i++){
					var str = includingFiles[i],
						whichFileToInclude = /include\s*file=&quot;(.+?)&quot;/.exec(str)[1],
						heightRegResult = /height=&quot;(.+?)&quot;/.exec(str),
						height = heightRegResult ? heightRegResult[1] : '800px',
						includingFilePath = path.resolve(dirName,whichFileToInclude);

					var demoCode = fs.readFileSync(includingFilePath);
					(function(str, demoCodeXtplPath, demoCode){
						xtpl.__express(demoCodeXtplPath,{
							demoCode : demoCode,
							height : height,
							settings : {
								'view encoding' : 'utf-8'
							}
						},function(err,demoCodeHtml){
							if(err){
								console.log('error occur:' + str);
							}else{
								fileHtml = fileHtml.replace(str,demoCodeHtml);
								xtpl.__express(mainXtplPath,{
									mainContent : fileHtml,
									sidebarContent : sideBarHtml,
									apilink : apilink,
									settings : {
										'view encoding' : 'utf-8'
									}
								},function(err,desFile){
									var desFileName = path.normalize(fileName.replace('src','').replace('md','html'));
									!fs.existsSync(path.dirname(desFileName)) && fs.mkdirSync(path.dirname(desFileName));
									fs.writeFileSync(desFileName, desFile);
								});
							}
						});
					})(str, demoCodeXtplPath, demoCode);
				}
			});
		}
		buildDemoIndex(demoLists);
	});
};


module.exports.buildOthers = function(srcUrl){
	srcDirPath = path.resolve(srcUrl);
	projectPath = path.resolve(srcUrl, '../../5.0');
	var mainXtplPath = path.resolve(srcDirPath,'../themes/layouts/main.xtpl');

	fs.readdirSync(srcDirPath).forEach(function(file){
		if(file === 'api' || file === 'demos' || file === 'guides'){
			return;  //这个三个目录在其他地方处理，如buildGuides/buildDemos等
		}
		var fileName = path.resolve(srcDirPath,file);
		if(!fs.statSync(fileName).isDirectory()){
			var mdContent = fs.readFileSync(fileName).toString(),
				desPath = path.normalize(fileName.replace('src','').replace('md','html')),
				fileHtml = marked(mdContent);
			// console.log(fileName);
			xtpl.__express(mainXtplPath,{
				mainContent : fileHtml,
				settings : {
					'view encoding' : 'utf-8'
				}
			},function(err,desFile){
				fs.writeFileSync(desPath,desFile);
			});
		}else{
			var desDirName = path.normalize(fileName.replace('src',''));
			!fs.existsSync(desDirName) && fs.mkdirSync(desDirName);
			fs.readdirSync(fileName).forEach(function(file){
				var srcFileName = path.resolve(fileName,file);
				var mdContent = fs.readFileSync(srcFileName).toString(),
					desPath = path.normalize(srcFileName.replace('src','').replace('md','html')),
					fileHtml = marked(mdContent);
				xtpl.__express(mainXtplPath,{
					mainContent : fileHtml,
					settings : {
						'view encoding' : 'utf-8'
					}
				},function(err,desFile){
					fs.writeFileSync(desPath,desFile);
				});
			});
		}
	});
};

function trunMdIntoHtml(mdContent,desPath){
	!fs.existsSync(desPath) && fs.mkdirSync(desPath);
	fs.writeFileSync(desFileName, desFile);
}

function getSideBarHtmlSync(dirUrl){
	var featureContent = getSideBarFeatures(dirUrl),
		demosContent = getSideBarDemos(dirUrl.replace('guides', 'demos'));
	return {
		featureContent : featureContent,
		demosContent : demosContent
	};
}

function getFeatures(dirUrl){
	var featureContent = '';
	if(fs.existsSync(dirUrl)){
		fs.readdirSync(dirUrl).forEach(function(file){
			var fileName = path.resolve(dirUrl,file);
			if(fs.statSync(fileName).isDirectory()){
				return;  //如果是文件夹，在这里暂时是cited-by-md文件夹，不处理
			}
			var fileContent = fs.readFileSync(fileName).toString(),
				// reg =  /^ *(#{1}) *([^\n]+?) *#* *(?:\n+|$)/,
				reg = /#(.*)/,
				feature = reg.exec(fileContent)[1].trim();
			var fileLink = path.normalize(path.relative(projectPath,fileName).replace('src','/5.0').replace('md','html'));
			feature = '<p><a href="' + fileLink +'">' + feature + '</a></p>';
			featureContent += feature;
		});
	}
	return featureContent;
}

function getSideBarFeatures(dirUrl){
	var filesPath = dirUrl.replace('demos','guides');
	return getFeatures(filesPath);
}
function getSideBarDemos(dirUrl){
	var filesPath = dirUrl.replace('guides','demos');
	return getFeatures(filesPath);
}

function buildGuideIndex(guidesModuleLists){
	var productGuideIndexPath = path.resolve(projectPath, './guides/index.html'),
		guidesIndexXtplPath = path.resolve(projectPath, './themes/guides/layouts/guides-index.xtpl');
	xtpl.__express(guidesIndexXtplPath,{
		settings : {
			'view encoding' : 'utf-8'
		},
		guidesModuleLists : guidesModuleLists
	},function(err,content){
		if(err){
			console.log('error occuring when render guides-index.xtpl');
		}else{
			fs.writeFileSync(productGuideIndexPath,content);
		}
	});
}

function buildDemoIndex(demoLists){
	var productDemoIndexPath = path.resolve(projectPath, './demos/index.html'),
		demosIndexXtplPath = path.resolve(projectPath, './themes/demos/layouts/demos-index.xtpl');

	xtpl.__express(demosIndexXtplPath,{
		settings : {
			'view encoding' : 'utf-8'
		},
		demoLists : demoLists
	},function(err,content){
		if(err){
			console.log('error occuring when render demos-index.xtpl');
		}else{
			fs.writeFileSync(productDemoIndexPath,content);
		}
	});
}