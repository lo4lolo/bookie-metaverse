/* 캐릭터 엔진 부품 파일을 순서대로 불러온다. (index.html · story.html · characters.html 이 이 파일 하나만 넣는다)
 * 순서: 뼈대 → 머리카락 → 옷 → 직업 옷 → 장비. 앞 파일의 도구를 뒤 파일이 쓴다. */
(function () {
  var V = '9';
  ['avatar', 'avatar_hair', 'avatar_hair2', 'avatar_wear', 'avatar_class', 'avatar_wear2', 'avatar_class2', 'avatar_gear', 'avatar_gear2', 'avatar_gear3']
    .forEach(function (n) { document.write('<script src="js/' + n + '.js?v=' + V + '"><\/script>'); });
})();
