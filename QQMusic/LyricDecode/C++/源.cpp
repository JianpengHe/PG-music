#include <cstdio>
#include <windows.h>
#include <cassert>
#include <conio.h>
using namespace std;

const int BUF_SIZE = 1024 * 1024;

char KEY1[] = "!@#)(NHLiuy*$%^&";
char KEY2[] = "123ZXC!@#)(*$%^&";
char KEY3[] = "!@#)(*$%^&abcDEF";

void print_bin2hex(char *buf, int len)
{
	for (int i = 0; i < len; i++)
	{
		unsigned int hex = buf[i];
		printf("%x%x", (hex / 16) % 16, hex % 16);
	}
	puts("");
}

int parse_hex()
{
	int c = getchar();
	if (c >= '0' && c <= '9')
		return (c - '0');
	else if (c >= 'a' && c <= 'f')
		return (c - 'a' + 10);
	else if (c >= 'A' && c <= 'F')
		return (c - 'A' + 10);
	else
		return -1;
}

int get_byte()
{
	int c = parse_hex();
	int d = parse_hex();
	if (c == -1 || d == -1)
	{
		return 999;
	};
	return c * 16 + d;
}

void write_byte(unsigned int hex)
{
	printf("%x%x", (hex / 16) % 16, hex % 16);
}

int main()
{
	auto lib = LoadLibrary(L"QQMusicCommon.dll");
	if (!lib)
		throw 1;

	auto func_ddes = (void (*)(char *, char *, int))GetProcAddress(lib, "?Ddes@qqmusic@@YAHPAE0H@Z");
	auto func_des = (void (*)(char *, char *, int))GetProcAddress(lib, "?des@qqmusic@@YAHPAE0H@Z");

	while (true)
	{
		int len = get_byte() * 256 + get_byte();
		// printf("len%d\n", len);
		char content[65536];
		int index = get_byte();
		int i = 0;
		while (len > i)
		{
			int ch = get_byte();
			content[i++] = ch;
			// printf("%d ", ch);
		}
		/*for (int i2 = 0; i2 < len; i2++) {
			// unsigned int hex = content[i2];
			printf("%d ", content[i2]);
		}*/
		func_ddes(content, KEY1, len);
		func_des(content, KEY2, len);
		func_ddes(content, KEY3, len);
		write_byte(index);
		for (int i2 = 0; i2 < len; i2++)
		{
			write_byte(content[i2]);
		}
		// exit(1);
	}
	return 0;
}
