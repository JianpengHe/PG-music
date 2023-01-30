#include "des.cpp"
#include <node.h>
#include <node_buffer.h>

unsigned char KEY1[] = "!@#)(NHLiuy*$%^&";
unsigned char KEY2[] = "123ZXC!@#)(*$%^&";
unsigned char KEY3[] = "!@#)(*$%^&abcDEF";

int func_des(unsigned char *buff, unsigned char *key, int len)
{
  BYTE schedule[16][6];
  des_key_setup(key, schedule, DES_ENCRYPT);
  for (int i = 0; i < len; i += 8)
    des_crypt(buff + i, buff + i, schedule);
  return 0;
}

int func_ddes(unsigned char *buff, unsigned char *key, int len)
{
  BYTE schedule[16][6];
  des_key_setup(key, schedule, DES_DECRYPT);
  for (int i = 0; i < len; i += 8)
    des_crypt(buff + i, buff + i, schedule);
  return 0;
}

namespace std
{
  void LyricDecode(const v8::FunctionCallbackInfo<v8::Value> &args)
  {
    v8::Isolate *isolate = args.GetIsolate();

    unsigned char *content = (unsigned char *)node::Buffer::Data(args[0]);
    int len = args[1]->Int32Value(isolate->GetCurrentContext()).FromJust();

    func_ddes(content, KEY1, len);
    func_des(content, KEY2, len);
    func_ddes(content, KEY3, len);

    args.GetReturnValue().Set(node::Buffer::Copy(isolate, (char *)content, len).ToLocalChecked());
  }

  void Initialize(v8::Local<v8::Object> exports)
  {
    NODE_SET_METHOD(exports, "LyricDecode", LyricDecode);
  }

  NODE_MODULE(NODE_GYP_MODULE_NAME, Initialize)
}