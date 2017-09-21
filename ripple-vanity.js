const log 	    = console.log;
const stdout    = process.stdout;
const cr 	    = '\r\x1b[K';
const vanitystr = process.argv[2];
const attempts 	= process.argv[3] || Math.round(Number.MAX_VALUE / 2);
const cluster 	= require('cluster');
const numCPUs 	= process.argv[4] || Math.max(1, require('os').cpus().length - 1);
const xrpKeygen	= require('ripple-keypairs');
const fs 		= require('fs');

var filename 	= 'VanityXRP_'+Math.round(new Date().getTime() / 1e3)+'.txt';
var start_time 	= Date.now();
var end_time 	= null;
var valid 		= vanitystr && !~vanitystr.search('(0|O|I|l)');
var regex 		= new RegExp(vanitystr, 'i');
var found 		= 0;
var usage 		= 'Ripple Vanity Address Finder v1.1\n\n'+
				'usage:    node ripple-vanity.js <search-regex> <number-of-attempts> <number-of-CPUs>\n'+
				'example:  node ripple-vanity.js "mj(i|1)" 1000000 4\n\n'+
				'<search-string> may be regex of comprised of any of these characters:\n'+
				'123456789 ABCDEFGH JKLMN PQRSTUVWXYZabcdefghijk mnopqrstuvwxyz\n'+
				'(Note: \'0\', \'I\', \'O\' and \'l\' are excluded.)\n---\n';

if (cluster.isMaster || !valid || !attempts) {
	log(usage);
	log('Vanity is valid:', valid);
	log('Searching', attempts, 'addresses for', regex, 'with', numCPUs, "CPUs\n");
	stdout.write(cr + '0%');

	for (var i = numCPUs - 1; i >= 0; i--) {
		cluster.fork();
	}
	
	// cluster.on('exit', function (deadWorker, code, signal) {
	// 	for (var id in cluster.workers) cluster.workers[id].process.kill();
	// 	return process.exit();
	// });
} else {
	var temp_wallet = null;
	var prog 	= (attempts/100).toFixed(0) * 1; // for speed not accuracy
	var step 	= prog;
	var perc 	= 0;

	for (var i = 0; i<attempts; i++){
		if (i == prog) {
			stdout.write(cr + ++perc + '%');
			prog += step;
		}
		temp_wallet = xrpKeygen.generateWallet();

		if (temp_wallet.accountID.search(regex) == 1) { 
			log('Found:', cr + i +', ' + temp_wallet.accountID + ', ' + temp_wallet.seed); 
			fs.appendFileSync(filename, temp_wallet.accountID+', '+temp_wallet.seed+'\n');
			found++;
		}
	}

	end_time = Date.now();
	var pl = (found>1 || found === 0) ? 'es' : '';
	log('Cluster', cluster.worker.id, ':', cr, found, 'address', pl, 'found. Took', ((end_time-start_time)/60e3).toFixed(1), 'minutes.');

	return process.exit();
}
