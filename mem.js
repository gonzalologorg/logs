var wk = require("./worker.js")
var io = require('@pm2/io')
var db = require("./db.js")
var Mem = {
    memory: {},
    pageMem: [],
    filters: {},
    clean: {},
    suspects: {}
}
var isInitialized = false
var lastUpdate = 0

wk.Mem = Mem

var mem_succ = io.counter({
    name : 'Mem Success'
  })
Mem.fetch = function (query, res) {
    const page = query.page || 0
    if (isInitialized && Mem.pageMem[page]) {
        console.log("Succesful found")
        res.json(Mem.pageMem[page]);
        res.status(200);
        mem_succ.inc();
    } else {
        mem_succ.dec();
        wk.fetch(page, function (data) {
            isInitialized = true
            res.json(Mem.pageMem[page]);
            res.status(200);
        })
    }
}


Mem.filter = function(filter, res){
    const arg = filter.arg
    const page = filter.page || 0
    if (!Mem.filters[arg])
        Mem.filters[arg] = []
    if (Mem.clean[arg] && Mem.filters[arg][page]){
        res.json(Mem.filters[arg][page])
        res.status(200)
        console.log("Loading memoery")
    }else{
        console.log("Writing memory")
        wk.doFilter(arg, page, function(data){
            res.json(Mem.filters[arg][page])
            res.status(200)
        })
    }
}

module.exports = Mem