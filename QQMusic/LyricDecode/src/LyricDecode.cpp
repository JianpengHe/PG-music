#include "des.cpp"

unsigned char KEY1[] = "!@#)(NHLiuy*$%^&";
unsigned char KEY2[] = "123ZXC!@#)(*$%^&";
unsigned char KEY3[] = "!@#)(*$%^&abcDEF";
extern "C"
{
  int LyricDecode(unsigned char *content, int len);
}
int LyricDecode(unsigned char *content, int len);

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

int LyricDecode(unsigned char *content, int len)
{
  func_ddes(content, KEY1, len);
  func_des(content, KEY2, len);
  func_ddes(content, KEY3, len);
  while (len && content[len - 1] == 0)
  {
    len--;
  }
  return len;
}
