const pdfgen = require('../utils/pdfgen');
const detokenize = require('../utils/detokenize');

exports.generatePDF = (req,res,next) => {
    const stream = res.writeHead(200,{
        'Content-Type':'application/pdf',
        'Content-Disposition':'attachment;filename='+req.body.tripname+'.pdf',
    });

    pdfgen.buildPDF(
        detokenize(req.session,req.body.tripid),
        chunk => stream.write(chunk),
        () => stream.end()
    );
};