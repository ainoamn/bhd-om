<script id="bhd-early-page-shell">
(function(){
    try{
        var nav=performance.getEntriesByType&&performance.getEntriesByType('navigation')[0];
        if(nav&&nav.type==='reload'){
            try{sessionStorage.setItem('bhd_app_refresh_fast','1');}catch(e){}
        }
        var p=new URLSearchParams(location.search);
        var m=p.get('mode');
        if(!m){
            try{m=sessionStorage.getItem('bhd_ui_last_mode')||localStorage.getItem('bhd_ui_last_mode');}catch(e){}
        }
        var cls={
            contracts:'mode-contracts',
            reservations:'mode-reservations',
            forms:'mode-forms',
            users:'mode-users',
            addressbook:'mode-addressbook',
            notifications:'mode-notifications',
            accounting:'mode-accounting',
            maintenance:'mode-maintenance',
            organization:'mode-organization',
            doc_templates:'mode-doc_templates',
            dashboard:'mode-dashboard'
        };
        if(m&&cls[m]){
            document.body.classList.add(cls[m]);
            if(p.get('viewer')!=='1')document.body.classList.add('entry-mode');
        }
    }catch(e){}
})();
</script>
