'use strict';
//var debug = require('debug')('wn:init'),
    //colors = require('colors'),
var path = require('path'),
    localPath = path.join(__dirname, 'node_modules');
var Download = require('download');
var progress = require('download-status');
var fs=require('fs');
var fse = require('fs-extra');
var rd = require('rd');
var inquirer = require("inquirer");
var exec = require('child_process').exec,
    child;
var root=fis.util.realpath(process.cwd());
var rootPathInfo=fis.util.pathinfo(root);
var parsedRootPath=parsePath(root);
//console.log(rootPathInfo.filename);
// prepend ./node_modules to NODE_PATH
process.env.NODE_PATH = process.env.NODE_PATH ?
    localPath + ':' + process.env.NODE_PATH : localPath;

function log(type, msg, color) {
    color = color || 'grey';
    var pad = Array(Math.max(0, 10 - type.length) + 1).join(' '),
        m = type === 'error' ? type : 'log';
    console[m]((pad + type).green, msg[color]);
}
function parsePath(path){
    //判断模块的模块名和版本号情况
    //D:/senro/senro/git/company/wn/wn-site/spm_modules/wn-9yin-nav/0.0.6
    var tmpPath=path.split('/');
    if(/[0-9]*\.[0-9]*\.[0-9]*/g.test(tmpPath[tmpPath.length-1])){
        //最后的名字是版本号，说明这是个从spm_modules安装的模块
        return {name:tmpPath[tmpPath.length-2],version:tmpPath[tmpPath.length-1]};
    }else{
        //最后的名字不是版本号，说明这是个本地模块
        return {name:tmpPath[tmpPath.length-1],version:''};
    }

}

exports.name = 'init';
exports.usage = '[options]';
exports.desc = 'init wn project';
exports.register = function (commander) {
    commander
        .option('-p, --pkg', 'only init package prepare files')
        .option('-c, --clean', 'clean template cache')
        .option('--skip-install', 'skip installation')
        .action(function () {
            //log('error', 'start init!!!!', 'red');
            //console.log(arguments);
            var options = arguments[arguments.length - 1];
            if(options.pkg){
                var packageJsonPath='./package.json';
                var readMeFile='./README.md';

                if(!fs.existsSync(packageJsonPath)){
                    //如果没有预置的package.Json,输出一个
                    inquirer.prompt([
                        {
                            type:'input',
                            name:'moduleName',
                            message:'模块名称是（不能有中文）?',
                            default:parsedRootPath.name,//默认为文件名
                            validate:function(projectName){
                                if(/^[\u2E80-\u9FFF]+$/g.test(projectName)){
                                    //如果有汉字
                                    return false;
                                }
                                return true;
                            }
                        },
                        {
                            type:'input',
                            name:'moduleDescription',
                            message:'模块描述？',
                            default:parsedRootPath.name
                        },
                        {
                            type:'input',
                            name:'moduleVersion',
                            message:'版本号?',
                            default:parsedRootPath.version?parsedRootPath.version:'0.0.1'
                        },
                        {
                            type:'list',
                            name:'moduleType',
                            message:'模块类型是?',
                            default:'js',
                            choices:['组件','css','js']
                        },
//                                    {
//                                        type:'input',
//                                        name:'moduleMain',
//                                        message:'模块主入口文件是?',
//                                        default:'index.js'
//                                    },
                        {
                            type:'input',
                            name:'moduleDeps',
                            message:'依赖哪些模块?',
                            default:''
                        }
                    ], function( answers ) {

                        ensureReadMeFile(readMeFile,answers);
                        fse.outputJsonSync(packageJsonPath, {
                            name: answers.moduleName,
                            version:answers.moduleVersion,
                            description: answers.moduleDescription,
                            keywords: [
                                answers.moduleName,
                                answers.moduleDescription
                            ],
                            homepage: "",
                            author: "haowu-team",
                            spm:{
                                main:'',//为了解决spm doc会编译main文件因为wn语法报错问题，故设为空，answers.moduleMain
                                type:answers.moduleType,
                                dependencies:cwdToObj(answers.moduleDeps),
                                devDependencies: {
                                    "expect.js": "0.3.1"
                                }
                            }
                        });

                    });


                }else{
                    //有预置的package.json
                    var packageJson=fse.readJsonSync(packageJsonPath);
                    if(!packageJson.spm.type){
                        inquirer.prompt([
                            {
                                type:'list',
                                name:'moduleType',
                                message:'模块类型是?',
                                default:'js',
                                choices:['组件','css','js']
                            }
                        ], function( answers ) {
                            packageJson.spm.type=answers.moduleType;
                            //将spm.dependencies改动写入packageJson
                            fse.writeJsonSync(packageJsonPath, packageJson);
                            ensureReadMeFile(readMeFile,{moduleName:packageJson.name,moduleVersion:packageJson.version});

                        });
                    }

                }
            }else{
                var projectAlias={
                    '官网':'wn-site-website',
                    '手机官网':'wn-site-mobliesite',
                    '专题':'wn-site-special',
                    '手机专题':'wn-site-mobilespecial'
                };
                var packageJson='./package.json';
                var snailGames;
                var download = new Download({ extract: true, strip: 1, mode: '755' })
                    //'https://codeload.github.com/snail-team/' +projectAlias[answers.gameType] + '/tar.gz/master'
                    //'https://github.com/snail-team/'+projectAlias[answers.gameType]+'/archive/master.zip'
                    //'https://raw.githubusercontent.com/scrat-team/scrat.js/master/scrat.js'
                    .get(fis.config.get('snailGames.json')||'https://raw.githubusercontent.com/snail-team/wn-data/master/snailGames.json')
                    .dest('./')
                    .use(progress());

                download.run(function (err, files, stream) {
                    if (err) {
                        throw err;
                    }
                    console.log('snailGames已下载完毕!');
                    snailGames=fse.readJsonSync('./snailGames.json');
                    //读取snailGames.json后删除
                    fse.removeSync('./snailGames.json');
                    var gameNameArr=[];
                    for(var gameName in snailGames){
                        if(snailGames[gameName].title!=''){
                            gameNameArr.push(gameName);
                        }
                    }
                    inquirer.prompt([
                        {
                            type:'list',
                            name:'gameName',
                            message:'蜗牛的哪个项目?',
                            default:'九阴真经',
                            choices:gameNameArr
                        },
                        {
                            type:'list',
                            name:'projectType',
                            message:'项目类型是?',
                            default:'官网',
                            choices:['官网','专题']
                        },
                        {
                            type:'input',
                            name:'specialName',
                            message:'专题名称是（中英文不限制）?',
                            default:function(answers){
                                return answers.gameName;
                            },//默认为文件名
                            when:function(answers){
                                if(answers.projectType=='专题'){
                                    return true;
                                }
                                return false;
                            }
                        },
                        {
                            type:'input',
                            name:'projectName',
                            message:'项目英文名称是（不能有中文）?',
                            default:rootPathInfo.filename,//默认为文件名
                            validate:function(projectName){
                                if(/^[\u2E80-\u9FFF]+$/g.test(projectName)){
                                    //如果有汉字
                                    return false;
                                }
                                return true;
                            }
                        },
                        {
                            type:'input',
                            name:'deps',
                            message:'你需要提前安装哪些模块?',
                            default:'jquery@1.8.3'
                        }
                    ], function( answers ) {
                        remote(answers);
                    });
                });
            }
            function ensureReadMeFile(file,answers){
                /*
                 保证readme文件的存在，存在则替换里面的name和version变量，不存在则创建一个readme文件
                 */
                //var stat = fs.lstatSync(file);

                if(fs.existsSync(file)){
                    var content=fs.readFileSync(file,'utf8');
                    if(typeof content == 'object'){
                        content=JSON.stringify(content);
                    }
                    content=content.replace(/\<\%name\%\>/g,answers.moduleName);
                    content=content.replace(/\<\%version\%\>/g,answers.moduleVersion);

                    fs.writeFileSync(file,content,'utf8');
                }else{
                    fs.writeFileSync(file, '# '+answers.moduleName+'\r\n'+answers.moduleName,'utf8');
                }
            }
            function local(answers){

                initPackageJson(answers);
                replaceVar(answers);
                install(answers);
            }
            function cwdToObj(deps){
                //jquery@1.8.3 nav@0.0.2
                var depsObj={},
                    tmpArr=deps.split(' ');
                for(var i=0;i<tmpArr.length;i++){
                    var module=tmpArr[i];
                    if(module&&module!=''){
                        var moduleName,moduleVersion;
                        if(/@/g.test(module)){
                            moduleName=module.split('@')[0];
                            moduleVersion=module.split('@')[1];
                            depsObj[moduleName]=moduleVersion;
                        }else{
                            moduleName=module;
                            moduleVersion='stable';
                            depsObj[moduleName]=moduleVersion;
                        }

                    }
                }
                return depsObj;//{jquery:'1.8.3',nav:'0.0.2'}
            }
            function remote(answers){
                console.log('请稍等，正在下载...');
                var download = new Download({ extract: true, strip: 1, mode: '755' })
                    //'https://codeload.github.com/snail-team/' +projectAlias[answers.gameType] + '/tar.gz/master'
                    //'https://github.com/snail-team/'+projectAlias[answers.gameType]+'/archive/master.zip'
                    //'https://raw.githubusercontent.com/scrat-team/scrat.js/master/scrat.js'
                    .get('https://raw.githubusercontent.com/snail-team/wn-site/master/fis-conf.js')
                    .get('https://github.com/snail-team/' +projectAlias[answers.projectType] + '/archive/master.zip')
                    .dest('./')
                    .use(progress());

                download.run(function (err, files, stream) {
                    if (err) {
                        throw err;
                    }
                    console.log('项目已下载完毕!');
                    initPackageJson(answers);
                    replaceVar(answers);
                    install(answers);
                });
            }
            function initPackageJson(answers){
                //写一个spm发布用的package.json
                console.log('开始生成初始package.json！');

                if(!fs.existsSync(packageJson)){
                    //如果没有预置的package.Json,输出一个
                    fse.outputJsonSync(packageJson, {name: answers.projectName});
                }

            }
            function replaceVar(answers){
                //执行变量替换
                console.log('开始执行变量替换！');
                var fileIgnore=new RegExp('(\\.git)|(fis-conf\\.js)$|(\\.jpg)$|(\\.png)$|(\\.gif)$','g');
                rd.each('./', function (f, s, next) {
                    var stat = fs.lstatSync(f);
                    //console.log(stat.isFile());
                    //console.log('all file:', f);
                    if(stat.isFile()&&!fileIgnore.test(f)){
                        //console.log('file:', f);
                        var content=fs.readFileSync(f,'utf8');
                        if(typeof content == 'object'){
                            content=JSON.stringify(content);
                        }
                        if(answers.gameName&&snailGames[answers.gameName]){
                            content=content.replace(/\<\%gameName\%\>/g,answers.gameName);
                            content=content.replace(/\<\%title\%\>/g,answers.specialName?answers.specialName+'-'+snailGames[answers.gameName].title:snailGames[answers.gameName].title);
                            content=content.replace(/\<\%description\%\>/g,snailGames[answers.gameName].description);
                            content=content.replace(/\<\%keywords\%\>/g,answers.specialName?answers.specialName+','+snailGames[answers.gameName].keywords:snailGames[answers.gameName].keywords);
                            content=content.replace(/\<\%gameId\%\>/g,snailGames[answers.gameName].gameId);
                            fs.writeFileSync(f,content,'utf8');
                        }else{
                            console.log('snailGames里没有找到：'+answers.gameName+'!');
                        }
                    }
                    next();
                }, function (err) {
                    if (err) throw err;
                });
            }
            function install(answers){
                //安装spm模块
                console.log('开始安装spm模块！');
                var json=fse.readJsonSync(packageJson);
                json.name=answers.projectName;
                if(answers.deps&&answers.deps!=''){
                    //如果有提前安装的模块，则进行依赖合并
                    var answerDepsObj=cwdToObj(answers.deps);
                    if(json.spm){
                        //说明有预置的packageJson
                        if(json.spm.dependencies){
                            //预置里packageJson有依赖，则进行不冲突合并
                            for(var moduleName in answerDepsObj){
                                //如果提前安装的模块和预置的package.json的spm.dependencies冲突，则将用户的加入到spm.dependencies
                                json.spm.dependencies[moduleName]=answerDepsObj[moduleName];
                            }
                        }else{
                            //预置里packageJson没有依赖，则直接加提前安装的模块写入依赖
                            json.spm.dependencies={};
                            for(var moduleName in answerDepsObj){
                                json.spm.dependencies[moduleName]=answerDepsObj[moduleName];
                            }
                        }

                    }else{
                        //说明没有预置的packageJson，packageJson是后来生成的，里面只有name属性,则把依赖写入spm.dependencies
                        json.spm={};
                        json.spm.dependencies={};
                        for(var moduleName in answerDepsObj){
                            json.spm.dependencies[moduleName]=answerDepsObj[moduleName];
                        }
                    }
                }
                //将spm.dependencies改动写入packageJson
                fse.writeJsonSync(packageJson, json);
                //如果有依赖，才进行安装
                if(json.spm&&json.spm.dependencies){
                    child = exec('spm install',
                        function (error, stdout, stderr) {
                            console.log('install: ' + stdout);
                            console.log(stderr);
                            if (error !== null) {
                                console.log('exec error: ' + error);
                            }
                        });
                }else{
                    console.log('没有需要安装的spm模块！');
                }
                function cwdToObj(deps){
                    //jquery@1.8.3 nav@0.0.2
                    var depsObj={},
                        tmpArr=deps.split(' ');
                    for(var i=0;i<tmpArr.length;i++){
                        var module=tmpArr[i];
                        if(module&&module!=''){
                            var moduleName,moduleVersion;
                            if(/@/g.test(module)){
                                moduleName=module.split('@')[0];
                                moduleVersion=module.split('@')[1];
                                depsObj[moduleName]=moduleVersion;
                            }else{
                                moduleName=module;
                                moduleVersion='stable';
                                depsObj[moduleName]=moduleVersion;
                            }

                        }
                    }
                    return depsObj;//{jquery:'1.8.3',nav:'0.0.2'}
                }
            }

        });
};