/* ==================================================================
   MENSAGENS EM VÍDEO  —  é AQUI (e só aqui) que você adiciona vídeos.
   ------------------------------------------------------------------
   Para cada novo vídeo, copie um bloco { ... } e preencha:

     id      identificador único (qualquer texto sem espaços)
     name    nome de quem gravou (pode ficar vazio '' se preferir)
     role    relação/descrição curta (ex.: 'Streamer', 'amigo') — opcional
     video   caminho do vídeo  (vertical 9:16, .mp4 H.264 + AAC)
     poster  caminho da imagem de capa (9:16, .webp ou .jpg) — opcional

   Coloque os arquivos na pasta /videos, por exemplo:
     videos/video-01.mp4   e   videos/video-01.webp
     videos/video-02.mp4   e   videos/video-02.webp

   A seção se ajusta sozinha a 1, 2, 3 ou mais vídeos.
   Se a lista ficar vazia, a seção inteira some.
   ================================================================== */
window.VIDEO_MESSAGES = [
  {
    id: 'video-01',
    name: '',            // TODO: nome de quem gravou o vídeo 1
    role: 'Streamer',
    video: 'videos/video-01.mp4',
    poster: 'videos/video-01.webp'
  },
  {
    id: 'video-02',
    name: '',            // TODO: nome de quem gravou o vídeo 2
    role: 'Streamer',
    video: 'videos/video-02.mp4',
    poster: 'videos/video-02.webp'
  }
];
