exports.handler = (event, context, callback) => {

  // Extract the request from the CloudFront event that is sent to Lambda@Edge 
  const {request} = event.Records[0].cf;

  const routesArray = [
      "quienes-expiden-soat",
      "preguntas-frecuentes",
      "ver-soat-virtual",
      "terminos-y-condiciones",
      "politica-de-proteccion-de-datos-personales",
      "contactanos",
      "tarifas-soat",
      "sobre-el-soat",
      "tramites-soat",
      "renovar-soat",
      "descargar-soat",
      "requisitos",
      "cotizar-soat-motos",
      "fotomultas",
      "multa-automatica-soat",
      "multas-de-transito",
      "soat-electronico-moto",
      "ver-multas-transito",
      "soat-gastos-funerarios",
      "soat-incapacidad-laboral",
      "soat-electronico-nacional",
      "landingpages_asset",
      "TarifarioSOAT.pdf",
      "que-es-runt",
      "AutorizacionVF2022.pdf",
      "FURIPS2024.pdf",
      "FURPEN2024.pdf",
      "FURTRAN2024.pdf"
  ]
  
  const bucketS3 = "landingpages-ecommerce-soat-dev.s3-website-us-east-1.amazonaws.com";
  
  // Extract the URI from the request
  const found = routesArray.find(element => element === request.uri.replace("/","").replace("/",""));


  if(found!==undefined){
      request.origin.custom.domainName = request.headers.host[0].value = bucketS3;
  }

  console.log("domainNameI: " + request.origin.custom.domainName);
  return callback(null, request)
};