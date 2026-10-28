import json
import unittest
from pathlib import Path
from html.parser import HTMLParser

ROOT = Path(__file__).resolve().parents[1]

class HtmlScan(HTMLParser):
    def __init__(self):
        super().__init__(); self.scripts=[]; self.styles=[]
    def handle_starttag(self, tag, attrs):
        d=dict(attrs)
        if tag=='script': self.scripts.append(d.get('src'))
        if tag=='link' and d.get('rel')=='stylesheet': self.styles.append(d.get('href'))

class ProjectTest(unittest.TestCase):
    def test_files_exist(self):
        for f in ('public/index.html','public/app.js','public/styles.css','public/favicon.svg','api/config.js','supabase/schema.sql','vercel.json'):
            self.assertTrue((ROOT/f).is_file(), f)
    def test_no_private_keys_in_frontend(self):
        js=(ROOT/'public/app.js').read_text()
        self.assertNotIn('service_role',js)
        self.assertNotIn('sb_secret_',js)
    def test_html_assets_exist(self):
        p=HtmlScan();p.feed((ROOT/'public/index.html').read_text())
        for rel in (p.scripts+p.styles):
            if rel and rel.startswith('/'):
                self.assertTrue((ROOT/'public'/rel.lstrip('/').split('?', 1)[0]).exists())
    def test_vercel_config(self):
        conf=json.loads((ROOT/'vercel.json').read_text())
        self.assertEqual(conf['outputDirectory'],'public')
        self.assertIsNone(conf['framework'])
    def test_sql_rls_enabled(self):
        sql=(ROOT/'supabase/schema.sql').read_text()
        for table in ('accounts','trades','journal_entries','payouts'):
            self.assertIn(f'alter table public.{table} enable row level security',sql)
        self.assertIn('auth.uid()',sql)

if __name__=='__main__':unittest.main()
