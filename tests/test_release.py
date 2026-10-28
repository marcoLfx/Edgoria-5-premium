import json
import subprocess
import unittest
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]

class ReleaseTests(unittest.TestCase):
    def test_has_no_guest_data_fallback(self):
        text=(ROOT/'public/app.js').read_text()
        for forbidden in ('initDemo()', 'localStorage.setItem(KEY', "case 'start-demo'", "state.mode==='demo'"):
            self.assertNotIn(forbidden,text)
        self.assertIn('renderSetup()',text)
        self.assertIn('resetPasswordForEmail',text)

    def test_login_privacy_pages(self):
        for n in ('privacidad.html','terminos.html'):
            self.assertTrue((ROOT/'public'/n).exists())
        self.assertIn('/privacidad.html',(ROOT/'public/app.js').read_text())

    def test_warm_palette(self):
        css=(ROOT/'public/styles.css').read_text()
        for code in ('#160F17','#FFBA70','#FF8A63','#56E6AE','#FFF5ED'):
            self.assertIn(code,css)
        self.assertIn('.welcome-card',css)

    def test_mt5_only_journal_without_playbooks(self):
        js = (ROOT / 'public' / 'app.js').read_text()
        self.assertNotIn("case 'new-trade':", js)
        self.assertNotIn("case 'import-csv':", js)
        self.assertNotIn("if(form.id==='trade-form')", js)
        self.assertIn(".like('external_id','mt5:%')", js)
        self.assertNotIn('function strategyModal(item)', js)
        self.assertIn('function annotationModal(t)', js)
        self.assertIn('PRÓXIMAMENTE', js)
        self.assertNotIn("const plays=['ICT FVG'",js)

    def test_replay_placeholder(self):
        js = (ROOT / 'public' / 'app.js').read_text()
        self.assertIn("Replay Studio está en desarrollo",js)
        self.assertNotIn('function parseOHLC(',js)
        self.assertNotIn('function candleChart(',js)

    def test_api_config_rejects_secret_and_accepts_publishable(self):
        javascript='''import config from './api/config.js';
const url='https://myproject.supabase.co';
async function go(key){process.env.NEXT_PUBLIC_SUPABASE_URL=url;process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=key;return await (await config.fetch(new Request('https://host.test/api/config'))).json()}
const publishable=await go('sb_publishable_abcdefghijklmnopqrstuv');
const secret=await go('sb_secret_abcdefghijklmnop');
const serviceJwt=await go(['eyJhbGciOiJIUzI1NiJ9',Buffer.from(JSON.stringify({role:'service_role'})).toString('base64url'),'signature'].join('.'));
const anonJwt=await go(['eyJhbGciOiJIUzI1NiJ9',Buffer.from(JSON.stringify({role:'anon'})).toString('base64url'),'signature'].join('.'));
console.log(JSON.stringify({publishable:publishable.configured,secret:secret.configured,serviceJwt:serviceJwt.configured,anonJwt:anonJwt.configured}));'''
        proc=subprocess.run(['node','--input-type=module','-e',javascript],cwd=ROOT,stdout=subprocess.PIPE,stderr=subprocess.PIPE,encoding='utf8',timeout=15)
        self.assertEqual(proc.returncode,0,proc.stderr)
        self.assertEqual(json.loads(proc.stdout),{'publishable':True,'secret':False,'serviceJwt':False,'anonJwt':True})

if __name__=='__main__':unittest.main()
