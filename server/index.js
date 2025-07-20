const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const { spawn } = require('child_process');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

let pmcProcess = null;

app.use(express.static('public'));

io.on('connection', (socket) => {
  console.log('클라이언트 연결됨:', socket.id);

  socket.on('start-pmc', () => {
    console.log('PMC 시작 요청');
    
    if (pmcProcess) {
      pmcProcess.kill();
      pmcProcess = null;
    }

    try {
      const pythonScript = path.join(__dirname, '../pmc_client.py');
      pmcProcess = spawn('python', [pythonScript]);
      
      pmcProcess.stdout.on('data', (data) => {
        const output = data.toString();
        console.log('PMC 출력:', output);
        socket.emit('receive-chunk', output);
      });

      pmcProcess.stderr.on('data', (data) => {
        const error = data.toString();
        console.error('PMC 오류:', error);
        socket.emit('pmc-error', error);
      });

      pmcProcess.on('close', (code) => {
        console.log(`PMC 프로세스 종료 코드: ${code}`);
        socket.emit('pmc-closed', code);
        pmcProcess = null;
      });

      socket.emit('pmc-ready');
      
    } catch (error) {
      console.error('PMC 시작 실패:', error);
      socket.emit('pmc-error', error.message);
    }
  });

  socket.on('send-message', (message) => {
    console.log('메시지 전송:', message);
    
    if (pmcProcess && pmcProcess.stdin) {
      pmcProcess.stdin.write(message + '\n');
    } else {
      socket.emit('pmc-error', 'PMC 프로세스가 실행되지 않았습니다.');
    }
  });

  socket.on('disconnect', () => {
    console.log('클라이언트 연결 해제:', socket.id);
    
    if (pmcProcess) {
      pmcProcess.kill();
      pmcProcess = null;
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`서버가 포트 ${PORT}에서 실행 중입니다.`);
});