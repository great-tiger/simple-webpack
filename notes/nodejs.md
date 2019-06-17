1. process.cwd() 是当前执行node命令时候的文件夹地址
2. __dirname 当前文件所在的目录
3. path.join 简单的路径拼接
> path.join('/a', '/b') // 'a/b'     
path.join('./a', './b') // 'a/b'   
返回的不是绝对地址
4. path.resolve 返回的是绝对地址
> path.resolve('/a', '/b') // '/b' 因为后面的那个用的绝对地址
path.resolve('./a', './b') // '/Users/username/Projects/webpack-demo/a/b'