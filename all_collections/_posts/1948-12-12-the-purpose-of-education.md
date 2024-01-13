---
layout: post
title: Ansible Role for Provisioning Virtual Machines in VMware VSphere
date: 2021-11-04
categories: [Ansible]
---

There are a bunch of resources available for creating VMs in VMware environments. The thing is that if we create a VM in production-ready environments, things are a bit, ah, let's say, different. When we are creating a VM by hand in a production-ready environment, there are a few things we usually do that are not directly related to the task of creating the VM. Ok, let me explain. 
    See the below flowchart. This is the most commonly used approach (not 100% complete) when we are creating VMs in production environments.


![VM Provissioning Image](https://lucid.app/publicSegments/view/fa98b297-95df-4611-8ddb-fddd46eb8a81/image.png)
`Folks please consider this is not a technical diagram this is just a diagram I have created to explain my point of view_` 

So I think you are ready to see some Ansible actions. You might need to open your VSCode. 
<br>
<br>
**_PS : In the below first, I was trying to divide and explain each task but if you just need to dive into the complete task scroll down folks._**

#### TASK 01: 
#### CHECK THE VIRTUAL MACHINE ALREADY EXISTS
---
>Just imagine that now you are creating a new virtual machine. The first thing you are doing is providing a name. Let's say we provide that name using an Ansible variable called _"vmware_name"_.
>This will search for that given name in the VSphere. and store the outputs in the "_vm_facts" variable. ya It's that simple.
>

{% raw %}
```yml
---
# You can use this way on both the Aansible Automation Platform and in terminal.
# If this needs to work, you have to first execute below commands with your VCenter credentials.
# export VMWARE_HOST=replace.your_vcenter_name.com export VMWARE_USER=administrator@your_vcenter_name.com export VMWARE_PASSWORD=replase_with_your_user_password 
# If you don't know what this is, I have simply explained it after the task.  
- name: Gather one specific VM's information
  community.vmware.vmware_vm_info:
    hostname: '{{ lookup("env", "VMWARE_HOST") }}'
    username: '{{ lookup("env", "VMWARE_USER") }}'
    password: '{{ lookup("env", "VMWARE_PASSWORD") }}'
    validate_certs: false
    vm_name: "{{ vmware_name }}"
  delegate_to: localhost
  register: vm_facts
  
```
{% endraw %}

#### TASK 02: 
#### Creating the Virtual Machine

>Ansible steps in like your trusty assistant, replicating the manual creation process but with the magic of automation. All you have to do is swap out the values you want with the variables :)

{% raw %}
```yml
---
# This is for picking the IP using DHCP, but if you need to use static IPs, remove all the tasks under the networks: and replase the commented part.
# No matter windows or Linux for both OS support this way
- name: Creating VM 
  community.vmware.vmware_guest:
    hostname: '{{ lookup("env", "VMWARE_HOST") }}' 
    username: '{{ lookup("env", "VMWARE_USER") }}'
    password: '{{ lookup("env", "VMWARE_PASSWORD") }}'
    datacenter: "{{ vmware_datacenter }}" 
    cluster: "{{ vmware_cluster }}"
    datastore: "{{ vmware_datastore }}"
    validate_certs: false
    folder: "{{ vmware_folder }}"
    name: "{{ vmware_name }}"
    state: poweredon
    template: "{{ vmware_template }}"
    disk: 
      - size_gb: "{{ vmware_disk_size_gb | int }}"
        type: "{{ vmware_disk_type | string }}"
        datastore: "{{ vmware_datastore }}"
    hardware: 
      memory_mb: "{{ vmware_memory_mb | int }}"
      num_cpus: "{{ vmware_number_of_cpus }}"
      num_cpu_cores_per_socket: "{{ vmware_number_cpu_cores_per_socket }}"
      hotadd_cpu: true
      hotremove_cpu: true
      hotadd_memory: false
    networks: 
      - name: "{{ vmware_networks_name }}"
        start_connected: true
        wait_for_customization: true
        wait_for_ip_address: true
    #For Static Networks 
    # networks: 
    #   - name: "{{ vmware_networks_name }}"
    #     type: static
    #     start_connected: true
    #     wait_for_customization: true
    #     wait_for_ip_address: true
    #     ip: "{{ vmware_ip }}"
    #     netmask: 255.255.255.0
    #     gateway: "{{vmware_gateway}}"
    customization: 
      domain: "{{ domain }}"
      hostname: "{{ hostname }}"
      dns_servers: "{{ dns_servers }}"   
  delegate_to: localhost
  register: host_created
  
```
{% endraw %}

> The task this code block does is simple, but it might be an issue, especially with Windows VMs. 
> **After you provisioned a Windows VM,**

- If Windows Administrator Account seems to be reset (you can see if you put a password to Administrator, it will be removed)
- If win_ping failed

>The reason behind this, folks, is our friendly neighborhood Sysprep, short for "System Preparation."

> If you need to fix this, you can follow mostly two different approaches.
> You can remove the OS customization (remove networks and customization) subtask when providing a VM, or you can just replace the administrator password and winrm configurations.

> To fix this issue, use the below scenario. And if you need to learn exactly what sysprep is and how it will affect you, read this post, and it will make sense to you.
> [Ansible Sysprep running issue](./another-page.html).




