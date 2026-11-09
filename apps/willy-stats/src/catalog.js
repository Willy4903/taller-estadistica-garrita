/* Catálogo de competiciones. Los datos de clubes, tablas y partidos vienen siempre de la captura publicada. */
export const catalog = {
 competitions: [
  {id:'per',flagAsset:'flags/per.svg',code:'per.1',name:'Liga 1',country:'Perú',flag:'🇵🇪',continent:'América',format:'apertura'},
  {id:'bra',flagAsset:'flags/bra.svg',code:'bra.1',name:'Brasileirão',country:'Brasil',flag:'🇧🇷',continent:'América',format:'league'},
  {id:'arg',flagAsset:'flags/arg.svg',code:'arg.1',name:'Liga Profesional',country:'Argentina',flag:'🇦🇷',continent:'América',format:'groups'},
  {id:'col',flagAsset:'flags/col.svg',code:'col.1',name:'Liga BetPlay',country:'Colombia',flag:'🇨🇴',continent:'América',format:'playoffs'},
  {id:'ecu',flagAsset:'flags/ecu.svg',code:'ecu.1',name:'LigaPro',country:'Ecuador',flag:'🇪🇨',continent:'América',format:'phases'},
  {id:'mex',flagAsset:'flags/mex.svg',code:'mex.1',name:'Liga MX',country:'México',flag:'🇲🇽',continent:'América',format:'apertura'},
  {id:'usa',flagAsset:'flags/usa.svg',code:'usa.1',name:'MLS',country:'Estados Unidos',flag:'🇺🇸',continent:'América',format:'playoffs'},
  {id:'lib',trophyAsset:'trophies/libertadores.svg',code:'conmebol.libertadores',name:'Copa Libertadores',country:'CONMEBOL',flag:'',continent:'América',format:'libertadores'},
  {id:'sud',trophyAsset:'trophies/sudamericana.svg',code:'conmebol.sudamericana',name:'Copa Sudamericana',country:'CONMEBOL',flag:'◉',continent:'América',format:'sudamericana'},
  {id:'ita',flagAsset:'flags/ita.svg',code:'ita.1',name:'Serie A',country:'Italia',flag:'🇮🇹',continent:'Europa',format:'league'},
  {id:'esp',flagAsset:'flags/esp.svg',code:'esp.1',name:'LaLiga',country:'España',flag:'🇪🇸',continent:'Europa',format:'league'},
  {id:'eng',flagAsset:'flags/eng.svg',code:'eng.1',name:'Premier League',country:'Inglaterra',flag:'🏴',continent:'Europa',format:'league'},
  {id:'ger',flagAsset:'flags/ger.svg',code:'ger.1',name:'Bundesliga',country:'Alemania',flag:'🇩🇪',continent:'Europa',format:'league'},
  {id:'fra',flagAsset:'flags/fra.svg',code:'fra.1',name:'Ligue 1',country:'Francia',flag:'🇫🇷',continent:'Europa',format:'league'},
  {id:'ucl',trophyAsset:'trophies/champions.svg',code:'uefa.champions',name:'Champions League',country:'UEFA',flag:'✦',continent:'Europa',format:'swiss'},
  {id:'uel',trophyAsset:'trophies/europa.svg',code:'uefa.europa',name:'Europa League',country:'UEFA',flag:'◈',continent:'Europa',format:'swiss'}
 ]
};
