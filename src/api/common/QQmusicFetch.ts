import { decodeAG1Response, encodeAG1Request } from "./QQmusicAG1";
import QQmusicSignV3 from "./QQmusicSignV3";
import { uint8Array8ToBase64 } from "./utils";

export async function QQmusicFetch(reqBody: string, host = "https://u6.y.qq.com/cgi-bin/musics.fcg") {
  const url = new URL(host);

  if (host.includes("musics.fcg")) {
    url.searchParams.append("_", new Date().getTime().toString());
    url.searchParams.append("encoding", "ag-1");
    url.searchParams.append("sign", await QQmusicSignV3(reqBody));
    reqBody = uint8Array8ToBase64(await encodeAG1Request(reqBody));
  }

  // console.log(url, body);
  const response = await fetch(url, {
    method: "POST",
    body: reqBody,
    headers: {
      // "accept-language": "zh-CN,zh;q=0.9,en-US;q=0.8,en;q=0.7",
      "content-type": "text/plain",
      // cookie:
      //   "_qimei_q36=25bcfae169a977c50a955a42300016618917; _qimei_h38=883e2b8c3f528f1859029a1602000009b18b15; pgv_pvid=3585252224; ts_uid=719280820; ptcz=60ba91e2c4d6411aac2c3049d70a66854cf9fdca32629db9e5704f008166571b; _clck=1mg56ym%7C2%7Cfvh%7C0%7C1945|1|g1o|0; fqm_pvqid=295b2a9f-acc1-481f-b3ab-d599a039ba49; fqm_sessionid=93275b5d-7541-4137-ab9f-fbc23d1b42ad; pgv_info=ssid=s9442367404; _qpsvr_localtk=0.4724653451889398; ptui_loginuin=1943718824; RK=PibGbLb0aI; login_type=1; psrf_access_token_expiresAt=1787449909; qqmusic_key=Q_H_L_63k3NorElqgrkwMr2AaYYLSwjaGPqOZXIxM6xUUdaAgGGt7zFlARQKRdwYP8H_EzQf17FTHZTdZl-ehR93ii8-W8X; tmeLoginType=2; euin=oKEPoiS5NecA7n**; wxunionid=; psrf_musickey_createtime=1782265909; psrf_qqopenid=4C0642D26F9D311734A02DBAF3294ACA; wxopenid=; uin=1943718824; psrf_qqrefresh_token=399D7A65F603CBE47B24926516913242; wxrefresh_token=; music_ignore_pskey=202306271436Hn@vBj; psrf_qqunionid=DC59C74AD7D4D68EAED783EFB4C139CA; qm_keyst=Q_H_L_63k3NorElqgrkwMr2AaYYLSwjaGPqOZXIxM6xUUdaAgGGt7zFlARQKRdwYP8H_EzQf17FTHZTdZl-ehR93ii8-W8X; psrf_qqaccess_token=3C63DBA9935656EE48A0649B5FC95316; ts_last=y.qq.com/n/ryqq_v2/search",
      // referer: "https://y.qq.com/",
    },
  });

  const data =
    url.searchParams.get("encoding") === "ag-1"
      ? JSON.parse(decodeAG1Response(new Uint8Array(await response.arrayBuffer())))
      : await response.json();
  console.log(data);
  return data;
}
