#include "LyricDecode.cpp"
#include <node.h>
#include <node_buffer.h>
namespace std
{
  void addonLyricDecode(const v8::FunctionCallbackInfo<v8::Value> &args)
  {
    v8::Isolate *isolate = args.GetIsolate();

    unsigned char *content = (unsigned char *)node::Buffer::Data(args[0]);
    int len = args[1]->Int32Value(isolate->GetCurrentContext()).FromJust();

    len = LyricDecode(content, len);

    args.GetReturnValue().Set(node::Buffer::Copy(isolate, (char *)content, len).ToLocalChecked());
  }

  void Initialize(v8::Local<v8::Object> exports)
  {
    NODE_SET_METHOD(exports, "LyricDecode", addonLyricDecode);
  }

  NODE_MODULE(NODE_GYP_MODULE_NAME, Initialize)
}