#include <node.h>
#include <node_buffer.h>
#include <iostream>
#include <windows.h>
char KEY1[] = "!@#)(NHLiuy*$%^&";
char KEY2[] = "123ZXC!@#)(*$%^&";
char KEY3[] = "!@#)(*$%^&abcDEF";

namespace std
{
  void LyricDecode(const v8::FunctionCallbackInfo<v8::Value> &args)
  {
    v8::Isolate *isolate = args.GetIsolate();
    typedef void (*DllDdes)(char *, char *, int);
    typedef void (*DllDes)(char *, char *, int);
    HINSTANCE hDll = LoadLibrary("QQMusicCommon.dll"); // 加载DLL文件
    DllDdes func_ddes = (DllDdes)GetProcAddress(hDll, "?Ddes@qqmusic@@YAHPAE0H@Z");
    DllDes func_des = (DllDes)GetProcAddress(hDll, "?des@qqmusic@@YAHPAE0H@Z");

    char *content = node::Buffer::Data(args[0]);
    int len = args[1]->Int32Value(isolate->GetCurrentContext()).FromJust();
    //  v8::String::Utf8Value str1(isolate, args[0]);
    //  string body(*str1);

    func_ddes(content, KEY1, len);
    func_des(content, KEY2, len);
    func_ddes(content, KEY3, len);
    FreeLibrary(hDll);

    //  args.GetReturnValue().Set(len);
    // for (int i = 0; i < len; i++)
    // {
    //   unsigned int hex = content[i];
    //   printf("%x%x", (hex / 16) % 16, hex % 16);
    // }
    // args.GetReturnValue().Set(String::NewFromUtf8(isolate, content, NewStringType::kNormal).ToLocalChecked());

    args.GetReturnValue().Set(node::Buffer::Copy(isolate,content,len).ToLocalChecked());
  }

  void Initialize(v8::Local<v8::Object> exports)
  {
    NODE_SET_METHOD(exports, "LyricDecode", LyricDecode);
  }

  NODE_MODULE(NODE_GYP_MODULE_NAME, Initialize)
}